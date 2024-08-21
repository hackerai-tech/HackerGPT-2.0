import {
  replaceWordsInLastUserMessage,
  updateSystemMessage,
  wordReplacements
} from "@/lib/ai-helper"
import {
  filterEmptyAssistantMessages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { executePythonCode } from "@/lib/tools/python-executor"
import { executeBashCommand } from "@/lib/tools/bash-executor"
import { createOpenAI } from "@ai-sdk/openai"
import { StreamData, streamText, tool } from "ai"
import { ServerRuntime } from "next"
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

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()

    const profile = await getAIProfile()
    const rateLimitCheckResult = await checkRatelimitOnApi(
      profile.user_id,
      "gpt-4"
    )
    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    updateSystemMessage(
      messages,
      llmConfig.systemPrompts.gpt4oWithTools,
      profile.profile_context
    )
    filterEmptyAssistantMessages(messages)
    replaceWordsInLastUserMessage(messages, wordReplacements)

    const openai = createOpenAI({
      baseUrl: llmConfig.openai.baseUrl,
      apiKey: llmConfig.openai.apiKey
    })

    const data = new StreamData()

    let hasExecutedCode = false

    const result = await streamText({
      model: openai("gpt-4o-2024-08-06"),
      temperature: 0.5,
      maxTokens: 1024,
      messages: toVercelChatMessages(messages, true),
      // abortSignal isn't working for some reason.
      abortSignal: request.signal,
      experimental_toolCallStreaming: true,
      tools: {
        webSearch: {
          description: "Search the web for latest information",
          parameters: z.object({ search: z.boolean() })
        },
        browser: {
          description:
            "Browse a webpage and extract its text content. \
        For HTML retrieval or more complex web scraping, use the Python tool.",
          parameters: z.object({
            open_url: z
              .string()
              .url()
              .describe("The URL of the webpage to browse")
          })
        },
        python: tool({
          description:
            "Runs Python code. Only one execution is allowed per request.",
          parameters: z.object({
            pipInstallCommand: z
              .string()
              .describe(
                "Full pip install command to install packages (e.g., '!pip install package1 package2')"
              ),
            code: z
              .string()
              .describe("The Python code to execute in a single cell.")
          }),
          async execute({ pipInstallCommand, code }) {
            if (hasExecutedCode) {
              return {
                results:
                  "Code execution skipped. Only one code cell can be executed per request.",
                runtimeError: null
              }
            }

            hasExecutedCode = true
            const execOutput = await executePythonCode(
              profile.user_id,
              code,
              pipInstallCommand
            )
            const { results, error: runtimeError } = execOutput

            return {
              results,
              runtimeError
            }
          }
        }),
        terminal: tool({
          description:
            "Runs bash commands. Only one execution is allowed per request.",
          parameters: z.object({
            code: z.string().describe("The bash command to execute.")
          }),
          async execute({ code }) {
            data.append({
              type: "terminal",
              content: `\n\`\`\`terminal\n${code}\n\`\`\``
            })

            if (hasExecutedCode) {
              const errorMessage =
                "Code execution skipped. Only one code cell can be executed per request."
              data.append({
                type: "stderr",
                content: `\n\`\`\`stderr\n${errorMessage}\n\`\`\``
              })
              return { stdout: "", stderr: errorMessage }
            }

            hasExecutedCode = true

            const execOutput = await executeBashCommand(
              profile.user_id,
              code,
              data
            )

            return execOutput
          }
        })
      },
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
