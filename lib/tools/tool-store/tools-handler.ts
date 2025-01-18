import { tool } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { streamText } from "ai"
import llmConfig from "@/lib/models/llm/llm-config"
import {
  filterEmptyAssistantMessages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import { terminalExecutor } from "./tools-terminal"
import { z } from "zod"
import { APIError } from "@/lib/models/llm/api-error"
import {
  replaceWordsInLastUserMessage,
  updateSystemMessage
} from "../../ai-helper"
import { getToolsWithAnswerPrompt } from "./prompts/system-prompt"
import { PluginID } from "@/types/plugins"
import { getTerminalTemplate } from "@/lib/tools/tool-store/tools-helper"
import {
  streamTerminalOutput,
  reduceTerminalOutput
} from "@/lib/ai/terminal-utils"
import { Sandbox } from "@e2b/code-interpreter"
import { createTerminal } from "@/lib/tools/tool-store/tools-terminal"

const DEFAULT_BASH_SANDBOX_TIMEOUT = 5 * 60 * 1000
const DEFAULT_TEMPLATE = "pro-terminal-tools"

interface CommandGeneratorHandlerOptions {
  userID: string
  profile_context: string
  messages: any[]
  pluginID: PluginID
  isTerminalContinuation: boolean
  isPremium: boolean
}

export async function commandGeneratorHandler({
  userID,
  profile_context,
  messages,
  pluginID,
  isTerminalContinuation,
  isPremium
}: CommandGeneratorHandlerOptions) {
  const customPrompt = getToolsWithAnswerPrompt(
    process.env.SECRET_PENTESTGPT_SYSTEM_PROMPT || "",
    pluginID
  )
  updateSystemMessage(messages, customPrompt, profile_context)
  filterEmptyAssistantMessages(messages)
  replaceWordsInLastUserMessage(messages)

  // Continue assistant message from previous terminal call
  if (isTerminalContinuation) {
    messages.pop()
  }

  const providerHeaders = {
    Authorization: `Bearer ${llmConfig.openrouter.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": `https://hacktheworld.com/tools-terminal`,
    "X-Title": "tools-terminal"
  }

  let sandbox: Sandbox | any = null
  let provider, model
  if (isPremium) {
    model = "gpt-4o"
    provider = createOpenAI()
  } else {
    model = "openai/gpt-4o"
    provider = createOpenAI({
      baseURL: llmConfig.openrouter.baseURL,
      headers: providerHeaders
    })
  }

  try {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        const enqueueChunk = (chunk: string) =>
          controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`))

        const { textStream, finishReason } = streamText({
          model: provider(model, { parallelToolCalls: false }),
          temperature: 0.5,
          maxTokens: isPremium ? 2048 : 1024,
          messages: toVercelChatMessages(messages, true),
          tools: {
            terminal: tool({
              description: "Generate and execute a terminal command",
              parameters: z.object({
                command: z.string().describe("The terminal command to execute")
              }),
              execute: async ({ command }) => {
                if (!sandbox) {
                  sandbox = await createTerminal(
                    userID,
                    getTerminalTemplate(pluginID) || DEFAULT_TEMPLATE,
                    DEFAULT_BASH_SANDBOX_TIMEOUT
                  )
                }

                const terminalStream = await terminalExecutor({
                  userID,
                  command,
                  pluginID,
                  sandbox
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
          maxSteps: 2,
          onFinish: async () => {
            if (sandbox) {
              await sandbox.kill()
            }
          }
        })

        for await (const chunk of textStream) {
          enqueueChunk(chunk)
        }

        const finalData = {
          finishReason: await finishReason
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
    if (sandbox) {
      await sandbox.kill()
    }
    console.error(`[${userID}] commandGeneratorHandler error:`, error)
    const { statusCode, message } = getErrorDetails(
      error instanceof Error ? error.message : "An unexpected error occurred"
    )
    throw new APIError(`Command Generator Error: ${message}`, statusCode)
  }
}

function getErrorDetails(errorMessage: string): {
  statusCode: number
  message: string
} {
  const errorMap: Record<string, { statusCode: number; message: string }> = {
    "Invalid Authentication": {
      statusCode: 401,
      message: "Invalid API key or organization. Please check your credentials."
    },
    "Incorrect API key provided": {
      statusCode: 401,
      message: "Invalid API key. Please check or regenerate your API key."
    },
    "You must be a member of an organization to use the API": {
      statusCode: 401,
      message:
        "Account not associated with an organization. Please contact support."
    },
    "Country, region, or territory not supported": {
      statusCode: 403,
      message: "Access denied due to geographical restrictions."
    },
    "Rate limit reached for requests": {
      statusCode: 429,
      message: "Too many requests. Please slow down your request rate."
    },
    "You exceeded your current quota": {
      statusCode: 429,
      message:
        "Usage limit reached. Please check your plan and billing details."
    },
    "The server had an error while processing your request": {
      statusCode: 500,
      message: "Internal server error. Please try again later."
    },
    "The engine is currently overloaded": {
      statusCode: 503,
      message: "Service temporarily unavailable. Please try again later."
    }
  }

  for (const [key, value] of Object.entries(errorMap)) {
    if (errorMessage.includes(key)) return value
  }

  return { statusCode: 500, message: "An unexpected error occurred" }
}
