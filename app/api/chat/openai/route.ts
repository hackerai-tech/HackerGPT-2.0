import { replaceWordsInLastUserMessage } from "@/lib/ai-helper"
import { buildSystemPrompt } from "@/lib/ai/prompts"
import {
  filterEmptyAssistantMessages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { createOpenAI } from "@ai-sdk/openai"
import { StreamData, streamText } from "ai"
import { ServerRuntime } from "next"
import { createToolSchemas } from "@/lib/tools/llm/toolSchemas"

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
    const { messages, isContinuation } = await request.json()

    const profile = await getAIProfile()
    const rateLimitCheckResult = await checkRatelimitOnApi(
      profile.user_id,
      "gpt-4"
    )
    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    filterEmptyAssistantMessages(messages)
    replaceWordsInLastUserMessage(messages)

    const openai = createOpenAI({
      baseURL: llmConfig.openai.baseURL,
      apiKey: llmConfig.openai.apiKey
    })

    const data = new StreamData()

    const { getSelectedSchemas } = createToolSchemas({
      profile,
      data,
      openai,
      messages
    })

    // Remove last message if it's a continuation to remove the continue prompt
    const cleanedMessages = isContinuation ? messages.slice(0, -1) : messages

    const result = streamText({
      model: openai("gpt-4o"),
      system: buildSystemPrompt(
        llmConfig.systemPrompts.gpt4o,
        profile.profile_context
      ),
      messages: toVercelChatMessages(cleanedMessages, true),
      temperature: 0.5,
      maxTokens: 2048,
      abortSignal: request.signal,
      tools: getSelectedSchemas("all"),
      onFinish: () => {
        data.close()
      }
    })

    return result.toDataStreamResponse({ data })
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
