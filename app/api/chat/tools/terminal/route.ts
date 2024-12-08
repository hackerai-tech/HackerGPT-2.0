import { ServerRuntime } from "next"
import { terminalExecutor } from "@/lib/tools/llm/terminal-executor"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"
import { ratelimit } from "@/lib/server/ratelimiter"
import { epochTimeToNaturalLanguage } from "@/lib/utils"
import llmConfig from "@/lib/models/llm/llm-config"
import { streamText, tool } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import {
  filterEmptyAssistantMessages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import { replaceWordsInLastUserMessage } from "@/lib/ai-helper"
import { buildSystemPrompt } from "@/lib/ai/prompts"
import {
  streamTerminalOutput,
  reduceTerminalOutput
} from "@/lib/ai/terminal-utils"
import { z } from "zod"

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

const MAX_TOKENS = 32000
const INITIAL_TOKENS = 1000

export async function POST(request: Request) {
  try {
    const { messages, isTerminalContinuation } = await request.json()

    const profile = await getAIProfile()
    const subscriptionInfo = await getSubscriptionInfo(profile.user_id)

    if (!subscriptionInfo.isPremium) {
      return new Response(
        "Access Denied: This feature is exclusive to Pro and Team members. Please upgrade your account to access the terminal.",
        { status: 403 }
      )
    }

    const rateLimitResult = await ratelimit(profile.user_id, "terminal")
    if (!rateLimitResult.allowed) {
      const waitTime = epochTimeToNaturalLanguage(
        rateLimitResult.timeRemaining!
      )
      return new Response(
        JSON.stringify({
          error: `Oops! It looks like you've reached the limit for terminal commands.\nTo ensure fair usage for all users, please wait ${waitTime} before trying again.`
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    filterEmptyAssistantMessages(messages)
    replaceWordsInLastUserMessage(messages)

    // Continue assistant message from previous terminal call
    if (isTerminalContinuation) {
      messages.pop()
    }

    const openai = createOpenAI({
      baseURL: llmConfig.openai.baseURL,
      apiKey: llmConfig.openai.apiKey
    })

    let finalFinishReason: string = "unknown"

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const enqueueChunk = (chunk: string) =>
          controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`))

        const { textStream, finishReason } = streamText({
          model: openai("gpt-4o", { parallelToolCalls: false }),
          temperature: 0.5,
          maxTokens: 2048,
          system: buildSystemPrompt(
            llmConfig.systemPrompts.pentestGPTTerminal,
            profile.profile_context
          ),
          messages: toVercelChatMessages(messages, true),
          abortSignal: request.signal,
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
                  enqueueChunk(chunk)
                  terminalOutput += chunk
                })
                terminalOutput = reduceTerminalOutput(terminalOutput)

                return terminalOutput
              }
            })
          },
          maxSteps: 3
        })

        for await (const chunk of textStream) {
          enqueueChunk(chunk)
        }

        finalFinishReason = await finishReason

        const finalData = {
          finishReason: finalFinishReason
        }
        controller.enqueue(encoder.encode(`d:${JSON.stringify(finalData)}\n`))
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked"
      }
    })
  } catch (error) {
    console.error("Terminal execution error:", error)
    return new Response("An error occurred while processing your request", {
      status: 500
    })
  }
}
