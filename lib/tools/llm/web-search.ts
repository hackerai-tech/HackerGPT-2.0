import { buildSystemPrompt } from "@/lib/ai/prompts"
import { toVercelChatMessages } from "@/lib/build-prompt"
import { PGPT4 } from "@/lib/models/llm/hackerai-llm-list"
import llmConfig from "@/lib/models/llm/llm-config"
import { GPT4o } from "@/lib/models/llm/openai-llm-list"

interface WebSearchConfig {
  chatSettings: any
  messages: any[]
  profile: any
  dataStream: any
}

async function getProviderConfig(chatSettings: any, profile: any) {
  const isProModel =
    chatSettings.model === PGPT4.modelId || chatSettings.model === GPT4o.modelId

  const defaultModel = "perplexity/llama-3.1-sonar-large-128k-online"
  const proModel = "perplexity/llama-3.1-sonar-large-128k-online"

  const providerHeaders = {
    "HTTP-Referer": "https://pentestgpt.com/web-search",
    "X-Title": "web-search"
  }

  const selectedModel = isProModel ? proModel : defaultModel

  const systemPrompt = buildSystemPrompt(
    llmConfig.systemPrompts.pentestGPTWebSearch,
    profile.profile_context
  )

  return {
    systemPrompt,
    providerHeaders,
    selectedModel
  }
}

export async function executeWebSearchTool({
  config
}: {
  config: WebSearchConfig
}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not set for web search")
  }

  const { chatSettings, messages, profile, dataStream } = config

  const { systemPrompt, providerHeaders, selectedModel } =
    await getProviderConfig(chatSettings, profile)

  console.log("[WebSearch] Executing web search with model:", selectedModel)

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
          content: systemPrompt
        },
        ...toVercelChatMessages(messages)
      ],
      max_tokens: 1024,
      temperature: 0.5,
      stream: true
    })
  })

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
            dataStream.writeData({ citations: citations })
          }
          isFirstChunk = false
        }

        // Handle content
        const content = parsed.choices[0]?.delta?.content
        if (content) {
          dataStream.writeData({
            type: "text-delta",
            content: content
          })
        }
      }
    }
  } catch (e) {
    console.error("Stream processing error:", e)
  }

  return "Web search completed"
}
