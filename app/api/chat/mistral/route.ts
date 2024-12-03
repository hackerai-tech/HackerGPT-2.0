import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"
import { buildSystemPrompt } from "@/lib/ai/prompts"
import {
  filterEmptyAssistantMessages,
  handleAssistantMessages,
  messagesIncludeImages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import { handleErrorResponse } from "@/lib/models/llm/api-error"
import llmConfig from "@/lib/models/llm/llm-config"
import { generateStandaloneQuestion } from "@/lib/models/question-generator"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAI } from "@ai-sdk/openai"
import { createDataStreamResponse, streamText } from "ai"
import { getModerationResult } from "@/lib/server/moderation"
import { createToolSchemas } from "@/lib/tools/llm/toolSchemas"

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
  const { messages, chatSettings, isRetrieval, isContinuation, isRagEnabled } =
    await request.json()

  let ragUsed = false
  let ragId: string | null = null
  const shouldUseRAG = !isRetrieval && isRagEnabled

  try {
    const profile = await getAIProfile()

    let {
      providerBaseUrl,
      providerHeaders,
      providerApiKey,
      selectedModel,
      rateLimitCheckResult,
      similarityTopK,
      modelTemperature,
      isPentestGPTPro
    } = await getProviderConfig(chatSettings, profile)

    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    if (!selectedModel) {
      throw new Error("Selected model is undefined")
    }

    // On normal chat, the last user message is the target standalone message
    // On continuation, the tartget is the last generated message by the system
    const targetStandAloneMessage = messages[messages.length - 2].content
    const filterTargetMessage = isContinuation
      ? messages[messages.length - 3]
      : messages[messages.length - 2]

    const includeImages = messagesIncludeImages(messages)

    let shouldUncensorResponse = false
    if (!includeImages && !isContinuation && !shouldUseRAG) {
      const { shouldUncensorResponse: moderationResult } =
        await getModerationResult(messages, llmConfig.openai.apiKey || "", 10)
      shouldUncensorResponse = moderationResult
    }

    const baseSystemPrompt = isPentestGPTPro
      ? llmConfig.systemPrompts.pgptLarge
      : llmConfig.systemPrompts.pgptSmall

    let systemPrompt = buildSystemPrompt(
      baseSystemPrompt,
      profile.profile_context
    )

    if (
      shouldUseRAG &&
      llmConfig.hackerRAG.enabled &&
      llmConfig.hackerRAG.endpoint &&
      llmConfig.hackerRAG.apiKey &&
      messages.length > 0 &&
      filterTargetMessage.role === "user" &&
      filterTargetMessage.content.length > llmConfig.hackerRAG.messageLength.min
    ) {
      const { standaloneQuestion, atomicQuestions } =
        await generateStandaloneQuestion(
          messages,
          targetStandAloneMessage,
          llmConfig.systemPrompts.pentestgptCurrentDateOnly,
          true,
          similarityTopK,
          providerBaseUrl,
          providerHeaders,
          llmConfig.models.pentestgpt_standalone_question_openrouter
        )

      const response = await fetch(llmConfig.hackerRAG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llmConfig.hackerRAG.apiKey}`
        },
        body: JSON.stringify({
          query: standaloneQuestion,
          questions: atomicQuestions,
          chunks: similarityTopK
        })
      })

      const data = await response.json()

      if (data && data.content) {
        ragUsed = true
        // Update system prompt with RAG content
        const ragPrompt =
          `${llmConfig.systemPrompts.RAG}\n` +
          `Context for RAG enrichment:\n` +
          `---------------------\n` +
          `${data.content}\n` +
          `---------------------\n` +
          `DON'T MENTION OR REFERENCE ANYTHING RELATED TO RAG CONTENT OR ANYTHING RELATED TO RAG. USER DOESN'T HAVE DIRECT ACCESS TO THIS CONTENT, ITS PURPOSE IS TO ENRICH YOUR OWN KNOWLEDGE. ROLE PLAY.`

        systemPrompt = buildSystemPrompt(ragPrompt, profile.profile_context)
      } else {
        selectedModel = "perplexity/llama-3.1-sonar-large-128k-online"
      }
      ragId = data?.resultId
    }

    const handleMessages = (shouldUncensor: boolean) => {
      if (includeImages) {
        selectedModel = "mistralai/pixtral-large-2411"
        return filterEmptyAssistantMessages(messages)
      }

      if (shouldUncensor) {
        return handleAssistantMessages(messages)
      }

      return filterEmptyAssistantMessages(messages)
    }

    handleMessages(shouldUncensorResponse)

    try {
      let provider

      if (selectedModel.startsWith("mistralai")) {
        provider = createMistral({
          apiKey: providerApiKey,
          baseURL: providerBaseUrl,
          headers: providerHeaders
        })
      } else if (selectedModel.startsWith("mistral")) {
        provider = createMistral({
          apiKey: llmConfig.mistral.apiKey
        })
      } else {
        provider = createOpenAI({
          baseURL: providerBaseUrl,
          headers: providerHeaders
        })
      }

      // Remove last message if it's a continuation to remove the continue prompt
      const cleanedMessages = isContinuation ? messages.slice(0, -1) : messages

      return createDataStreamResponse({
        execute: dataStream => {
          dataStream.writeData({ ragUsed, ragId })

          let tools
          if (isPentestGPTPro) {
            const toolSchemas = createToolSchemas({})
            tools = toolSchemas.getSelectedSchemas(["webSearch", "browser"])
          }

          const result = streamText({
            model: provider(
              selectedModel || "",
              isPentestGPTPro ? { parallelToolCalls: false } : {}
            ),
            system: systemPrompt,
            messages: toVercelChatMessages(cleanedMessages, includeImages),
            temperature: modelTemperature,
            maxTokens: isPentestGPTPro ? 2048 : 1024,
            // abortSignal isn't working for some reason.
            abortSignal: request.signal,
            ...(isPentestGPTPro ? { tools } : null)
          })

          result.mergeIntoDataStream(dataStream)
        },
        onError: error => {
          // Log the error message to the server console
          console.error(
            "Error occurred:",
            error instanceof Error ? error.message : String(error)
          )

          // Return a generic error message to the client
          return "An error occurred while processing your request."
        }
      })
    } catch (error) {
      return handleErrorResponse(error)
    }
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

async function getProviderConfig(chatSettings: any, profile: any) {
  const isPentestGPTPro = chatSettings.model === "mistral-large"

  const defaultModel = llmConfig.models.pentestgpt_default_openrouter
  const proModel = llmConfig.models.pentestgpt_pro_openrouter

  const providerUrl = llmConfig.openrouter.url
  const providerBaseUrl = llmConfig.openrouter.baseURL
  const providerApiKey = llmConfig.openrouter.apiKey

  const providerHeaders = {
    Authorization: `Bearer ${providerApiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": `https://pentestgpt.com/${chatSettings.model}`,
    "X-Title": chatSettings.model
  }

  let modelTemperature = 0.5
  let similarityTopK = 3
  let selectedModel = isPentestGPTPro ? proModel : defaultModel
  let rateLimitCheckResult = await checkRatelimitOnApi(
    profile.user_id,
    isPentestGPTPro ? "pentestgpt-pro" : "pentestgpt"
  )

  return {
    providerUrl,
    providerBaseUrl,
    providerApiKey,
    providerHeaders,
    selectedModel,
    rateLimitCheckResult,
    similarityTopK,
    isPentestGPTPro,
    modelTemperature
  }
}
