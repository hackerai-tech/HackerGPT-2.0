import { buildSystemPrompt } from "@/lib/ai/prompts"
import { toVercelChatMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { streamText } from "ai"
import { createDeepSeek } from "@ai-sdk/deepseek"

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
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key is not set for reason LLM")
  }

  const { messages, profile, dataStream } = config

  console.log("[ReasonLLM] Executing reasonLLM")
  
  const deepseek = createDeepSeek()
  let thinkingStartTime: number | null = null
  let thinkingElapsedSecs: number | null = null

  const result = streamText({
    model: deepseek("deepseek-reasoner"),
    temperature: 0.5,
    maxTokens: 1024,
    system: buildSystemPrompt(
      llmConfig.systemPrompts.pentestGPTTerminal,
      profile.profile_context
    ),
    messages: toVercelChatMessages(messages, true)
  })

  let enteredReasoning = false
  let enteredText = false
  for await (const part of result.fullStream) {
    if (part.type === "reasoning") {
      if (!enteredReasoning) {
        enteredReasoning = true
        thinkingStartTime = Date.now()
      }
      dataStream.writeData({
        type: "thinking",
        content: part.textDelta
      })
    } else if (part.type === "text-delta") {
      if (!enteredText) {
        enteredText = true
        if (thinkingStartTime) {
          thinkingElapsedSecs = Math.round(
            (Date.now() - thinkingStartTime) / 1000
          )
          dataStream.writeData({
            type: "thinking-time",
            elapsed_secs: thinkingElapsedSecs
          })
        }
      }
      dataStream.writeData({
        type: "text-delta",
        content: part.textDelta
      })
    }
  }

  return "Reason LLM execution completed"
}
