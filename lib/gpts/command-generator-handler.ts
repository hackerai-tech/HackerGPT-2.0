import { StreamingTextResponse, tool } from "ai"
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
  updateSystemMessage,
  wordReplacements
} from "../ai-helper"
import { getCustomGPTPrompt } from "./tools-prompts"
import { PluginID } from "@/types/plugins"

const ENCODER = new TextEncoder()

interface CommandGeneratorHandlerOptions {
  userID: string
  profile_context: string
  messages: any[]
  pluginID: PluginID
}

export async function commandGeneratorHandler({
  userID,
  profile_context,
  messages,
  pluginID
}: CommandGeneratorHandlerOptions) {
  const initialSystemPrompt = process.env.SECRET_PENTESTGPT_SYSTEM_PROMPT || ""
  const customPrompt = getCustomGPTPrompt(initialSystemPrompt, pluginID)
  updateSystemMessage(messages, customPrompt, profile_context)
  filterEmptyAssistantMessages(messages)
  replaceWordsInLastUserMessage(messages, wordReplacements)

  const openai = createOpenAI({
    baseUrl: llmConfig.openai.baseUrl,
    apiKey: llmConfig.openai.apiKey
  })

  try {
    let terminalStream: ReadableStream<Uint8Array> | null = null

    const { textStream } = await streamText({
      model: openai("gpt-4o-2024-08-06"),
      temperature: 0.5,
      maxTokens: 1024,
      messages: toVercelChatMessages(messages, true),
      experimental_toolCallStreaming: true,
      tools: {
        terminal: tool({
          description: "Generate and execute a terminal command",
          parameters: z.object({
            command: z.string().describe("The terminal command to execute")
          }),
          execute: async ({ command }) => {
            terminalStream = await terminalExecutor({ userID, command })
            return "Command executed successfully"
          }
        })
      }
    })

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for await (const chunk of textStream) {
          controller.enqueue(ENCODER.encode(chunk))
        }

        if (terminalStream) {
          const reader = terminalStream.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        }

        controller.close()
      }
    })

    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error(`[${userID}] commandGeneratorHandler error:`, error)
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred"
    const { statusCode, message } = getErrorDetails(errorMessage)
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
    if (errorMessage.includes(key)) {
      return value
    }
  }

  return { statusCode: 500, message: "An unexpected error occurred" }
}
