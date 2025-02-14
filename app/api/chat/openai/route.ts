import { replaceWordsInLastUserMessage } from "@/lib/ai-helper"
import { buildSystemPrompt } from "@/lib/ai/prompts"
import {
  filterEmptyAssistantMessages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { openai } from "@ai-sdk/openai"
import { smoothStream, streamText } from "ai"
import { ServerRuntime } from "next"
import { createToolSchemas } from "@/lib/tools/llm/toolSchemas"
import { PluginID } from "@/types/plugins"
import { executeWebSearchTool } from "@/lib/tools/llm/web-search"
import { createStreamResponse } from "@/lib/ai-helper"
import { executeTerminalTool } from "@/lib/tools/llm/terminal"
import { executeReasonLLMTool } from "@/lib/tools/llm/reason-llm"
import { executeReasoningWebSearchTool } from "@/lib/tools/llm/reasoning-web-search"

export const runtime: ServerRuntime = "edge"
export const preferredRegion = [
  "iad1",
  "arn1",
  "bom1",
  "cdg1",
  "cle1",
  "cpt1",
  "dub1",
  "fra1",
  "gru1",
  "hnd1",
  "icn1",
  "kix1",
  "lhr1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1"
]

export async function POST(request: Request) {
  try {
    const { chatSettings, messages, isTerminalContinuation, selectedPlugin } =
      await request.json()

    const profile = await getAIProfile()
    const rateLimitCheckResult = await checkRatelimitOnApi(
      profile.user_id,
      selectedPlugin === PluginID.REASONING ||
        selectedPlugin === PluginID.REASONING_WEB_SEARCH
        ? "reasoning"
        : "gpt-4"
    )
    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    filterEmptyAssistantMessages(messages)
    replaceWordsInLastUserMessage(messages)

    // Handle special plugins
    switch (selectedPlugin) {
      case PluginID.WEB_SEARCH:
        return createStreamResponse(async dataStream => {
          await executeWebSearchTool({
            config: { chatSettings, messages, profile, dataStream }
          })
        })

      case PluginID.TERMINAL || isTerminalContinuation:
        return createStreamResponse(async dataStream => {
          await executeTerminalTool({
            config: { messages, profile, dataStream, isTerminalContinuation }
          })
        })

      case PluginID.REASONING:
        return createStreamResponse(async dataStream => {
          await executeReasonLLMTool({
            config: { messages, profile, dataStream }
          })
        })

      case PluginID.REASONING_WEB_SEARCH:
        return createStreamResponse(async dataStream => {
          await executeReasoningWebSearchTool({
            config: { messages, profile, dataStream }
          })
        })
    }

    const systemPrompt = buildSystemPrompt(
      llmConfig.systemPrompts.gpt4o,
      profile.profile_context
    )

    return createStreamResponse(dataStream => {
      const { getSelectedSchemas } = createToolSchemas({
        chatSettings,
        messages,
        profile,
        dataStream,
        isTerminalContinuation
      })

      const result = streamText({
        model: openai("gpt-4o", { parallelToolCalls: false }),
        system: systemPrompt,
        messages: toVercelChatMessages(messages, true),
        temperature: 0.5,
        maxTokens: 2048,
        abortSignal: request.signal,
        tools: getSelectedSchemas(["browser", "webSearch", "terminal"]),
        experimental_transform: smoothStream({ chunking: "word" })
      })

      result.mergeIntoDataStream(dataStream)
    })
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
