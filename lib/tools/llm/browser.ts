import { buildSystemPrompt } from "@/lib/ai/prompts"
import { toVercelChatMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { createOpenAI } from "@ai-sdk/openai"
import { smoothStream, streamText } from "ai"
import { GPT4o } from "@/lib/models/llm/openai-llm-list"
import { LargeModel } from "@/lib/models/llm/hackerai-llm-list"

interface BrowserToolConfig {
  chatSettings: any
  profile: any
  messages: any[]
  dataStream: any
}

async function getProviderConfig(chatSettings: any) {
  const isProModel =
    chatSettings.model === LargeModel.modelId ||
    chatSettings.model === GPT4o.modelId

  const defaultModel = "gpt-4o-mini"
  const proModel = "gpt-4o"

  const selectedModel = isProModel ? proModel : defaultModel

  return {
    selectedModel,
    isProModel
  }
}

export function getLastUserMessage(messages: any[]): string {
  return (
    messages.findLast(msg => msg.role === "user")?.content || "Unknown query"
  )
}

export async function browsePage(url: string): Promise<string> {
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
        "X-No-Cache": "true",
        "X-With-Images-Summary": "true",
        "X-With-Links-Summary": "true"
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

export function createBrowserPrompt(
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
offer valuable insights or suggest practical alternatives. \
If the webpage content is empty, irrelevant, or indicates an error, \
clearly state that you couldn't access the information and explain why.

Important: Do not refer to "the webpage content provided" or "the information given" in your response. \
Instead, answer as if you have directly attempted to view the webpage and are sharing your experience with it.`
}

export async function executeBrowserTool({
  open_url,
  config
}: {
  open_url: string
  config: BrowserToolConfig
}) {
  if (!process.env.JINA_API_TOKEN) {
    throw new Error("JINA_API_TOKEN environment variable is not set")
  }

  const { chatSettings, profile, messages, dataStream } = config
  const { selectedModel } = await getProviderConfig(chatSettings)
  const browserResult = await browsePage(open_url)
  const lastUserMessage = getLastUserMessage(messages)
  const browserPrompt = createBrowserPrompt(browserResult, lastUserMessage)

  const openai = createOpenAI()

  console.log("[BrowserTool] Executing browser tool with model:", selectedModel)

  const { fullStream } = streamText({
    model: openai(selectedModel),
    system: buildSystemPrompt(
      llmConfig.systemPrompts.pentestGPTBrowser,
      profile.profile_context
    ),
    messages: [
      ...toVercelChatMessages(messages.slice(0, -1)),
      { role: "user", content: browserPrompt }
    ],
    temperature: 0.5,
    maxTokens: 1024,
    experimental_transform: smoothStream()
  })

  for await (const delta of fullStream) {
    if (delta.type === "text-delta") {
      dataStream.writeData({
        type: "text-delta",
        content: delta.textDelta
      })
    }
  }

  return "Browser tool executed"
}
