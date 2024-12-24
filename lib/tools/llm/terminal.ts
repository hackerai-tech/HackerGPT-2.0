import { buildSystemPrompt } from "@/lib/ai/prompts"
import { toVercelChatMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { createOpenAI } from "@ai-sdk/openai"
import { streamText, tool } from "ai"
import { z } from "zod"
import { terminalExecutor } from "./terminal-executor"
import {
  streamTerminalOutput,
  reduceTerminalOutput
} from "@/lib/ai/terminal-utils"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"
import { ratelimit } from "@/lib/server/ratelimiter"
import { epochTimeToNaturalLanguage } from "@/lib/utils"

interface TerminalToolConfig {
  messages: any[]
  profile: any
  dataStream: any
  isTerminalContinuation?: boolean
}

export async function executeTerminal({
  config
}: {
  config: TerminalToolConfig
}) {
  const { messages, profile, dataStream, isTerminalContinuation } = config

  const subscriptionInfo = await getSubscriptionInfo(profile.user_id)
  if (!subscriptionInfo.isPremium) {
    dataStream.writeData({
      type: "error",
      content:
        "Access Denied: This feature is exclusive to Pro and Team members."
    })
    return "Access Denied: Premium feature only"
  }

  const rateLimitResult = await ratelimit(profile.user_id, "terminal")
  if (!rateLimitResult.allowed) {
    const waitTime = epochTimeToNaturalLanguage(rateLimitResult.timeRemaining!)
    dataStream.writeData({
      type: "error",
      content: `⚠️ You've reached the limit for terminal usage.\n\nTo ensure fair usage for all users, please wait ${waitTime} before trying again.`
    })
    return "Rate limit exceeded"
  }

  // Continue assistant message from previous terminal call
  const cleanedMessages = isTerminalContinuation
    ? messages.slice(0, -1)
    : messages

  const openai = createOpenAI({
    baseURL: llmConfig.openai.baseURL,
    apiKey: llmConfig.openai.apiKey
  })

  const { textStream, finishReason } = streamText({
    model: openai("gpt-4o", { parallelToolCalls: false }),
    temperature: 0.5,
    maxTokens: 2048,
    system: buildSystemPrompt(
      llmConfig.systemPrompts.pentestGPTTerminal,
      profile.profile_context
    ),
    messages: toVercelChatMessages(cleanedMessages, true),
    tools: {
      terminal: tool({
        description: "Generate and execute a terminal command",
        parameters: z.object({
          command: z.string().describe("The terminal command to execute")
        }),
        execute: async ({ command }) => {
          const terminalStream = await terminalExecutor({
            userID: profile.user_id,
            command,
            template: "bash-terminal-v1"
          })
          let terminalOutput = ""
          await streamTerminalOutput(terminalStream, chunk => {
            dataStream.writeData({
              type: "text-delta",
              content: chunk
            })
            terminalOutput += chunk
          })
          return reduceTerminalOutput(terminalOutput)
        }
      })
    },
    maxSteps: 2
  })

  for await (const chunk of textStream) {
    dataStream.writeData({
      type: "text-delta",
      content: chunk
    })
  }

  const finalFinishReason = await finishReason
  dataStream.writeData({ finishReason: finalFinishReason })

  return "Terminal execution completed"
}
