import { buildSystemPrompt } from "@/lib/ai/prompts"
import { toVercelChatMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { streamText } from "ai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createOpenAI as createOpenRouter } from "@ai-sdk/openai"

interface ReasonLLMConfig {
  messages: any[]
  profile: any
  dataStream: any
}

export async function executeReasonLLMTool({
  config
}: {
  config: ReasonLLMConfig
}) {
  const { messages, profile, dataStream } = config
  console.log("[ReasonLLM] Executing reasonLLM")

  // Simplified provider selection
  const reasoningProvider =
    llmConfig.models.reasoning === "deepseek-reasoner"
      ? initializeDeepSeek()
      : initializeOpenRouter()

  await processStream({
    reasoningProvider,
    messages,
    profile,
    dataStream
  })

  return "Reason LLM execution completed"
}

function initializeDeepSeek() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key is not set for reason LLM")
  }
  return createDeepSeek()
}

function initializeOpenRouter() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not set for reason LLM")
  }
  return createOpenRouter({
    baseURL: llmConfig.openrouter.baseURL,
    apiKey: llmConfig.openrouter.apiKey
  })
}

async function processStream({
  reasoningProvider,
  messages,
  profile,
  dataStream
}: {
  reasoningProvider: any
  messages: any
  profile: any
  dataStream: any
}) {
  let thinkingStartTime = null
  let enteredReasoning = false
  let enteredText = false

  const result = streamText({
    model: reasoningProvider(llmConfig.models.reasoning),
    temperature: 0.5,
    maxTokens: 1024,
    system: buildSystemPrompt(
      llmConfig.systemPrompts.pentestGPTChat,
      profile.profile_context
    ),
    messages: toVercelChatMessages(messages, true)
  })

  for await (const part of result.fullStream) {
    if (part.type === "reasoning" && !enteredReasoning) {
      enteredReasoning = true
      thinkingStartTime = Date.now()
      dataStream.writeData({ type: "thinking", content: part.textDelta })
    } else if (part.type === "text-delta" && !enteredText) {
      enteredText = true
      if (thinkingStartTime) {
        const thinkingElapsedSecs = Math.round(
          (Date.now() - thinkingStartTime) / 1000
        )
        dataStream.writeData({
          type: "thinking-time",
          elapsed_secs: thinkingElapsedSecs
        })
      }
      dataStream.writeData({ type: "text-delta", content: part.textDelta })
    } else {
      if (part.type === "text-delta" || part.type === "reasoning") {
        dataStream.writeData({
          type: part.type,
          content: part.textDelta
        })
      }
    }
  }
}
