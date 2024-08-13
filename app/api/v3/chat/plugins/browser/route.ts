import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"
import { updateOrAddSystemMessage } from "@/lib/ai-helper"
import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import {
  buildFinalMessages,
  filterEmptyAssistantMessages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import { GPT4o } from "@/lib/models/llm/openai-llm-list"
import { PGPT4 } from "@/lib/models/llm/hackerai-llm-list"
import { createOpenAI as createOpenRouterClient } from "@ai-sdk/openai"
import { streamText } from "ai"

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
  const json = await request.json()
  const { payload, chatImages, open_url } = json as {
    payload: any
    chatImages: any
    open_url: string
  }

  try {
    const profile = await getAIProfile()
    const chatSettings = payload.chatSettings

    let { providerHeaders, selectedModel, rateLimitCheckResult } =
      await getProviderConfig(chatSettings, profile)

    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    const cleanedMessages = (await buildFinalMessages(
      payload,
      profile,
      chatImages,
      null
    )) as any[]
    updateOrAddSystemMessage(
      cleanedMessages,
      llmConfig.systemPrompts.pentestGPTBrowser
    )
    filterEmptyAssistantMessages(cleanedMessages)

    const browserResult = await browsePage(open_url)
    const lastUserMessage = getLastUserMessage(cleanedMessages)
    const browserPrompt = createBrowserPrompt(browserResult, lastUserMessage)

    const openrouter = createOpenRouterClient({
      baseUrl: llmConfig.openrouter.baseUrl,
      apiKey: llmConfig.openrouter.apiKey,
      headers: providerHeaders
    })

    const result = await streamText({
      model: openrouter(selectedModel),
      messages: [
        ...toVercelChatMessages(cleanedMessages.slice(0, -1)),
        { role: "user", content: browserPrompt }
      ],
      temperature: 0.5,
      maxTokens: 1024,
      abortSignal: request.signal
    })

    return result.toDataStreamResponse()
  } catch (error: any) {
    console.error("Error in browser endpoint:", error)
    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

async function getProviderConfig(chatSettings: any, profile: any) {
  const isProModel =
    chatSettings.model === PGPT4.modelId || chatSettings.model === GPT4o.modelId

  const defaultModel = "openai/gpt-4o-mini"
  const proModel = "openai/gpt-4o-mini"

  const providerHeaders = {
    "HTTP-Referer": "https://pentestgpt.com/browser",
    "X-Title": "browser"
  }

  let selectedModel = isProModel ? proModel : defaultModel

  let rateLimitIdentifier
  if (chatSettings.model === GPT4o.modelId) {
    rateLimitIdentifier = "gpt-4"
  } else if (chatSettings.model === PGPT4.modelId) {
    rateLimitIdentifier = "pentestgpt-pro"
  } else {
    rateLimitIdentifier = "pentestgpt"
  }

  let rateLimitCheckResult = await checkRatelimitOnApi(
    profile.user_id,
    rateLimitIdentifier
  )

  return {
    providerHeaders,
    selectedModel,
    rateLimitCheckResult,
    isProModel
  }
}

function getLastUserMessage(messages: any[]): string {
  return (
    messages.findLast(msg => msg.role === "user")?.content || "Unknown query"
  )
}

async function browsePage(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`
  const jinaToken = process.env.JINA_API_TOKEN

  if (!jinaToken) {
    console.error("JINA_API_TOKEN is not set in the environment variables")
    throw new Error("JINA_API_TOKEN is not set in the environment variables")
  }

  try {
    const response = await fetch(jinaUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jinaToken}`,
        "X-Timeout": "15",
        "X-With-Generated-Alt": "true",
        "X-No-Cache": "true"
      }
    })

    if (!response.ok) {
      console.error(`Error fetching URL: ${url}. Status: ${response.status}`)
      return `No content could be retrieved from the URL: ${url}. The webpage might be empty, unavailable, or there could be an issue with the content retrieval process. HTTP status: ${response.status}`
    }

    const content = await response.text()

    if (!content) {
      console.error(`Empty content received from URL: ${url}`)
      return `No content could be retrieved from the URL: ${url}. The webpage might be empty, unavailable, or there could be an issue with the content retrieval process.`
    }

    return content
  } catch (error) {
    console.error("Error browsing URL:", url, error)
    return `No content could be retrieved from the URL: ${url}. The webpage might be empty, unavailable, or there could be an issue with the content retrieval process.`
  }
}

function createBrowserPrompt(
  browserResult: string,
  lastUserMessage: string
): string {
  return `<webpage_content>
${browserResult}
</webpage_content>

<user_query>
${lastUserMessage}
</user_query>

Based on the webpage content above, please answer the user's query concisely and accurately. \
If the content doesn't directly address the query, provide the most relevant information available \
or suggest alternative approaches.`
}