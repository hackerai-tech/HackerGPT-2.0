import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"

import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { filterEmptyAssistantMessages } from "@/lib/build-prompt"
import { GPT4o } from "@/lib/models/llm/openai-llm-list"
import { PGPT4 } from "@/lib/models/llm/hackerai-llm-list"
import { toVercelChatMessages } from "@/lib/build-prompt"
import { buildSystemPrompt } from "@/lib/ai/prompts"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  try {
    const { messages, chatSettings } = await request.json()
    const profile = await getAIProfile()
    const { providerHeaders, selectedModel, rateLimitCheckResult } =
      await getProviderConfig(chatSettings, profile)

    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    filterEmptyAssistantMessages(messages)

    const response = await fetch(llmConfig.openrouter.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llmConfig.openrouter.apiKey}`,
        "Content-Type": "application/json",
        ...providerHeaders
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(
              llmConfig.systemPrompts.pentestGPTWebSearch,
              profile.profile_context
            )
          },
          ...toVercelChatMessages(messages)
        ],
        max_tokens: 1024,
        temperature: 0.5,
        stream: true
      })
    })

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let isFirstChunk = true

        try {
          while (true) {
            const { done, value } = (await reader?.read()) || {
              done: true,
              value: undefined
            }
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue
              const data = line.slice(6)
              if (data === "[DONE]") continue

              const parsed = JSON.parse(data)

              // Handle citations only on first chunk
              if (isFirstChunk) {
                const citations = parsed.citations
                if (citations?.length) {
                  controller.enqueue(`2:${JSON.stringify([{ citations }])}\n`)
                }
                isFirstChunk = false
              }

              // Handle content
              const content = parsed.choices[0]?.delta?.content
              if (content) {
                controller.enqueue(`0:${JSON.stringify(content)}\n`)
              }
            }
          }
        } catch (e) {
          console.error("Stream processing error:", e)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-vercel-ai-data-stream": "v1"
      }
    })
  } catch (error: any) {
    console.error("Error in web search endpoint:", error)
    return new Response(
      JSON.stringify({
        message: error.message || "An unexpected error occurred"
      }),
      { status: error.status || 500 }
    )
  }
}

async function getProviderConfig(chatSettings: any, profile: any) {
  const isProModel =
    chatSettings.model === PGPT4.modelId || chatSettings.model === GPT4o.modelId

  const defaultModel = "perplexity/llama-3.1-sonar-small-128k-online"
  const proModel = "perplexity/llama-3.1-sonar-large-128k-online"

  const providerHeaders = {
    "HTTP-Referer": "https://pentestgpt.com/web-search",
    "X-Title": "web-search"
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
