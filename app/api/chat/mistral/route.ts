import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"

import { updateSystemMessage } from "@/lib/ai-helper"

import {
  filterEmptyAssistantMessages,
  handleAssistantMessages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import { handleErrorResponse } from "@/lib/models/llm/api-error"
import llmConfig from "@/lib/models/llm/llm-config"
import { generateStandaloneQuestion } from "@/lib/models/question-generator"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAI } from "@ai-sdk/openai"
import { StreamData, streamText } from "ai"
import { detectCategoryAndModeration } from "@/lib/server/moderation"
import { createToolSchemas } from "@/lib/tools/llm/toolSchemas"
import { CONTINUE_PROMPT_BACKEND } from "@/lib/models/llm/llm-prompting"

export const runtime: ServerRuntime = "edge"

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

    const detectionMessages = messages.slice(1, -1).slice(-4)

    const { hazardCategory, moderationLevel } =
      await detectCategoryAndModeration(
        detectionMessages,
        detectionMessages[detectionMessages.length - 1].content,
        llmConfig.openrouter.url,
        providerHeaders
      )

    updateSystemMessage(
      messages,
      isPentestGPTPro
        ? llmConfig.systemPrompts.pgpt4
        : llmConfig.systemPrompts.pgpt35,
      profile.profile_context
    )

    if (isContinuation) {
      messages[messages.length - 1].content = CONTINUE_PROMPT_BACKEND(
        messages[messages.length - 2].content.slice(-25)
      )
    }

    // On normal chat, the last user message is the target standalone message
    // On continuation, the tartget is the last generated message by the system
    const targetStandAloneMessage = messages[messages.length - 2].content
    const filterTargetMessage = isContinuation
      ? messages[messages.length - 3]
      : messages[messages.length - 2]

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
          similarityTopK
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
        messages[0].content =
          `${llmConfig.systemPrompts.RAG}\n` +
          `Context for RAG enrichment:\n` +
          `---------------------\n` +
          `${data.content}\n` +
          `---------------------\n` +
          `DON'T MENTION OR REFERENCE ANYTHING RELATED TO RAG CONTENT OR ANYTHING RELATED TO RAG. USER DOESN'T HAVE DIRECT ACCESS TO THIS CONTENT, ITS PURPOSE IS TO ENRICH YOUR OWN KNOWLEDGE. ROLE PLAY.`
      } else {
        selectedModel = "perplexity/llama-3.1-sonar-large-128k-online"
      }
      ragId = data?.resultId
    }

    const highRiskCategories = ["S4", "S12", "S3", "S11"]
    const isHighRiskCategory = highRiskCategories.includes(
      hazardCategory.toUpperCase()
    )

    const shouldUseMiniModel =
      !isPentestGPTPro &&
      (moderationLevel === -1 ||
        moderationLevel === 0 ||
        (moderationLevel >= 0.0 && moderationLevel <= 0.1))

    if (shouldUseMiniModel) {
      selectedModel = "openai/gpt-4o-mini"
      filterEmptyAssistantMessages(messages)
    } else if (
      moderationLevel >= 0.3 &&
      moderationLevel <= 0.8 &&
      !isHighRiskCategory
    ) {
      handleAssistantMessages(messages)
    } else {
      filterEmptyAssistantMessages(messages)
    }

    try {
      let provider

      if (selectedModel.startsWith("mistral")) {
        provider = createMistral({
          apiKey: providerApiKey,
          baseURL: providerBaseUrl,
          headers: providerHeaders
        })
      } else if (selectedModel.startsWith("accounts/fireworks")) {
        provider = createOpenAI({
          apiKey: llmConfig.fireworks.apiKey,
          baseURL: llmConfig.fireworks.baseUrl
        })
      } else {
        provider = createOpenAI({
          baseURL: providerBaseUrl,
          headers: providerHeaders
        })
      }

      const data = new StreamData()
      data.append({ ragUsed, ragId })

      let tools
      if (selectedModel === "openai/gpt-4o-mini") {
        const toolSchemas = createToolSchemas({ profile, data })
        tools = toolSchemas.getSelectedSchemas(["webSearch", "browser"])
      }

      const result = await streamText({
        model: provider(selectedModel),
        messages: toVercelChatMessages(messages),
        temperature: modelTemperature,
        maxTokens: isPentestGPTPro ? 2048 : 1024,
        // abortSignal isn't working for some reason.
        abortSignal: request.signal,
        ...(selectedModel === "openai/gpt-4o-mini"
          ? {
              tools
            }
          : {}),
        onFinish: () => {
          data.close()
        }
      })

      return result.toDataStreamResponse({ data })
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
  const proModel = llmConfig.models.pentestgpt_pro_fireworks

  const providerUrl = llmConfig.openrouter.url
  const providerBaseUrl = llmConfig.openrouter.baseUrl
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
