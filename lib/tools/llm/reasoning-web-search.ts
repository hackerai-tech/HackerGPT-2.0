import { buildSystemPrompt } from "@/lib/ai/prompts"
import { toVercelChatMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { streamText } from "ai"
import { perplexity } from "@ai-sdk/perplexity"

interface ReasoningWebSearchConfig {
  messages: any[]
  profile: any
  dataStream: any
}

export async function executeReasoningWebSearchTool({
  config
}: {
  config: ReasoningWebSearchConfig
}) {
  const { messages, profile, dataStream } = config

  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key is not set for reason LLM")
  }

  console.log("Executing ReasoningWebSearch for user", profile.user_id)

  await processStream({
    messages,
    profile,
    dataStream
  })

  return "[ReasoningWebSearch] Execution completed"
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
  let thinkingStartTime = null
  let enteredThinking = false

  const result = streamText({
    model: perplexity("sonar-reasoning"),
    temperature: 0.5,
    maxTokens: 2048,
    system: buildSystemPrompt(
      llmConfig.systemPrompts.pentestGPTWebSearch,
      profile.profile_context
    ),
    messages: toVercelChatMessages(messages)
  })

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      const text = part.textDelta

      if (text.includes("<think>")) {
        enteredThinking = true
        thinkingStartTime = Date.now()
        // Send text before <think> if any
        const beforeThink = text.split("<think>")[0]
        if (beforeThink) {
          dataStream.writeData({
            type: "text-delta",
            content: beforeThink
          })
        }
        // Send thinking content immediately
        const thinkingContent = text.split("<think>")[1] || ""
        if (thinkingContent) {
          dataStream.writeData({
            type: "reasoning",
            content: thinkingContent
          })
        }
        continue
      }

      if (enteredThinking) {
        if (text.includes("</think>")) {
          // Handle end of thinking block
          enteredThinking = false
          const thinkingElapsedSecs = thinkingStartTime
            ? Math.round((Date.now() - thinkingStartTime) / 1000)
            : null

          // Send thinking content before </think>
          const finalThinking = text.split("</think>")[0]
          if (finalThinking) {
            dataStream.writeData({
              type: "reasoning",
              content: finalThinking
            })
          }

          // Send thinking time
          dataStream.writeData({
            type: "thinking-time",
            elapsed_secs: thinkingElapsedSecs
          })

          // Send remaining text after </think> if any
          const afterThink = text.split("</think>")[1]
          if (afterThink) {
            dataStream.writeData({
              type: "text-delta",
              content: afterThink
            })
          }
        } else {
          // Send thinking content immediately
          dataStream.writeData({
            type: "reasoning",
            content: text
          })
        }
      } else {
        // Immediately send non-thinking text
        dataStream.writeData({
          type: "text-delta",
          content: text
        })
      }
    }
  }
  // Send citations from metadata when available
  const metadata = await result.experimental_providerMetadata
  const citations = metadata?.perplexity?.citations as string[] | undefined
  if (citations?.length) {
    dataStream.writeData({ citations })
  }
}
