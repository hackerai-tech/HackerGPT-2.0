import { buildSystemPrompt } from "@/lib/ai/prompts"
import { toVercelChatMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { streamText } from "ai"
import { mistral } from "@ai-sdk/mistral"

interface CodingLLMConfig {
  messages: any[]
  profile: any
  dataStream: any
}

export async function executeCodingLLM({
  config
}: {
  config: CodingLLMConfig
}) {
  const { messages, profile, dataStream } = config

  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("Mistral API key is not set for coding LLM")
  }

  console.log("[CodingLLM] Executing coding LLM")

  await processStream({
    messages,
    profile,
    dataStream
  })

  return "[CodingLLM] Execution completed"
}

async function processStream({
  messages,
  profile,
  dataStream
}: {
  messages: any
  profile: any
  dataStream: any
}) {
  const result = streamText({
    model: mistral("codestral-latest"),
    temperature: 0.5,
    maxTokens: 2048,
    system: buildSystemPrompt(
      llmConfig.systemPrompts.pentestGPTChat,
      profile.profile_context
    ),
    messages: toVercelChatMessages(messages)
  })

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      dataStream.writeData({
        type: part.type,
        content: part.textDelta
      })
    }
  }
}
