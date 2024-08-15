import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"
import { updateSystemMessage } from "@/lib/ai-helper"
import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import {
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
  const { messages, chatSettings, open_url } = await request.json()

  try {
    const profile = await getAIProfile()

    let { providerHeaders, selectedModel, rateLimitCheckResult } =
      await getProviderConfig(chatSettings, profile)

    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    updateSystemMessage(
      messages,
      llmConfig.systemPrompts.gpt4oWithTools,
      profile.profile_context
    )
    filterEmptyAssistantMessages(messages)

    const browserResult = await browsePage(open_url)
    const lastUserMessage = getLastUserMessage(messages)
    const browserPrompt = createBrowserPrompt(browserResult, lastUserMessage)

    const openrouter = createOpenRouterClient({
      baseUrl: llmConfig.openrouter.baseUrl,
      apiKey: llmConfig.openrouter.apiKey,
      headers: providerHeaders
    })

    const result = await streamText({
      model: openrouter(selectedModel),
      messages: [
        ...toVercelChatMessages(messages.slice(0, -1)),
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
  return `You have just browsed a webpage. The content you found is enclosed below:

<webpage_content>
${browserResult}
</webpage_content>

The user has the following query about this webpage:

<user_query>
${lastUserMessage}
</user_query>

With the information from the webpage content above, \
respond to the user's query as if you have comprehensive knowledge of the page. \
Provide a direct and insightful answer to the query. \
If the specific details are not present, draw upon related information to \
offer valuable insights or suggest practical alternatives.

Important: Do not refer to "the webpage content provided" or "the information given" in your response. \
Instead, answer as if you have directly viewed the webpage and are sharing your knowledge about it.`
}
