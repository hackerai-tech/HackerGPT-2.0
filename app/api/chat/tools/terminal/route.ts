import { ServerRuntime } from "next"
import { terminalExecutor } from "@/lib/tools/llm/terminal-executor"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { isPremiumUser } from "@/lib/server/subscription-utils"
import { ratelimit } from "@/lib/server/ratelimiter"
import { epochTimeToNaturalLanguage } from "@/lib/utils"
import llmConfig from "@/lib/models/llm/llm-config"
import { streamText, tool } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import {
  filterEmptyAssistantMessages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import {
  replaceWordsInLastUserMessage,
  updateSystemMessage
} from "@/lib/ai-helper"
import { z } from "zod"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    const profile = await getAIProfile()
    if (!(await isPremiumUser(profile.user_id))) {
      return new Response(
        "Access Denied: This feature is exclusive to Pro members. Please upgrade to a Pro account to access the terminal.",
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

    updateSystemMessage(
      messages,
      llmConfig.systemPrompts.pentestGPTTerminal,
      profile.profile_context
    )
    filterEmptyAssistantMessages(messages)
    replaceWordsInLastUserMessage(messages)

    const openai = createOpenAI({
      baseUrl: llmConfig.openai.baseUrl,
      apiKey: llmConfig.openai.apiKey
    })

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const enqueueChunk = (chunk: string) =>
          controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`))

        let iterationResponse = ""

        for (let i = 0; i < 3; i++) {
          let terminalExecuted = false
          const { textStream, finishReason } = await streamText({
            model: openai("gpt-4o-2024-08-06"),
            temperature: 0.5,
            maxTokens: 1024,
            messages: toVercelChatMessages(messages, true),
            abortSignal: request.signal,
            tools: {
              terminal: tool({
                description: "Generate and execute a terminal command",
                parameters: z.object({
                  command: z
                    .string()
                    .describe("The terminal command to execute")
                }),
                execute: async ({ command }) => {
                  if (terminalExecuted) {
                    return
                  }
                  terminalExecuted = true
                  const terminalStream = await terminalExecutor({
                    userID: profile.user_id,
                    command
                  })
                  await streamTerminalOutput(terminalStream, chunk => {
                    enqueueChunk(chunk)
                    iterationResponse += chunk
                  })
                }
              })
            }
          })

          for await (const chunk of textStream) {
            iterationResponse += chunk
            enqueueChunk(chunk)
          }

          if (iterationResponse.trim()) {
            const lastMessage = messages[messages.length - 1]
            if (lastMessage && lastMessage.role === "assistant") {
              lastMessage.content += "\n" + iterationResponse.trim()
            } else {
              messages.push({
                role: "assistant",
                content: iterationResponse.trim()
              })
            }
          }

          if ((await finishReason) !== "tool-calls") break
        }

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

async function streamTerminalOutput(
  terminalStream: ReadableStream<Uint8Array>,
  enqueueChunk: (chunk: string) => void
): Promise<string> {
  const reader = terminalStream.getReader()
  let terminalOutput = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = new TextDecoder().decode(value)
    terminalOutput += chunk
    enqueueChunk(chunk)
  }
  return terminalOutput
}
