import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"

import { updateSystemMessage } from "@/lib/ai-helper"

import {
  filterEmptyAssistantMessages,
  toVercelChatMessages
} from "@/lib/build-prompt"
import { handleErrorResponse } from "@/lib/models/llm/api-error"
import llmConfig from "@/lib/models/llm/llm-config"
import { generateStandaloneQuestion } from "@/lib/models/question-generator"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAI } from "@ai-sdk/openai"
import { StreamData, streamText, tool } from "ai"
// import { executePythonCode } from "@/lib/tools/python-executor"
import { z } from "zod"
import { generateAndUploadImage } from "@/lib/tools/image-generator"

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
  const {
    messages,
    chatSettings,
    detectedModerationLevel,
    isRetrieval,
    isContinuation,
    isRagEnabled
  } = await request.json()

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
      selectedStandaloneQuestionModel,
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

    updateSystemMessage(
      messages,
      isPentestGPTPro
        ? llmConfig.systemPrompts.pgpt4
        : detectedModerationLevel === 0 ||
            (detectedModerationLevel >= 0.0 && detectedModerationLevel <= 0.1)
          ? llmConfig.systemPrompts.pgpt35
          : llmConfig.systemPrompts.pentestGPTChat,
      profile.profile_context
    )

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
          providerBaseUrl,
          providerHeaders,
          selectedStandaloneQuestionModel,
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
      }
      ragId = data?.resultId
    }

    if (
      (detectedModerationLevel === 0 && !isPentestGPTPro) ||
      (detectedModerationLevel >= 0.0 &&
        detectedModerationLevel <= 0.1 &&
        !isPentestGPTPro)
    ) {
      selectedModel = "openai/gpt-4o-mini"
      filterEmptyAssistantMessages(messages)
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
      } else {
        provider = createOpenAI({
          baseURL: providerBaseUrl,
          headers: providerHeaders
        })
      }

      // Send custom data to the client
      const data = new StreamData()
      data.append({ ragUsed, ragId })

      // let hasExecutedCode = false

      const result = await streamText({
        model: provider(selectedModel),
        messages: toVercelChatMessages(messages),
        temperature: modelTemperature,
        maxTokens: 1024,
        // abortSignal isn't working for some reason.
        abortSignal: request.signal,
        experimental_toolCallStreaming: true,
        tools:
          selectedModel === "openai/gpt-4o-mini" || isPentestGPTPro
            ? {
                webSearch: {
                  description: "Search the web for latest information",
                  parameters: z.object({ search: z.boolean() })
                },
                browser: {
                  description:
                    "Browse a webpage and extract its text content. \
                For HTML retrieval or more complex web scraping, use the Python tool.",
                  parameters: z.object({
                    open_url: z
                      .string()
                      .url()
                      .describe("The URL of the webpage to browse")
                  })
                },
                ...(isPentestGPTPro && {
                  generateImage: tool({
                    description: "Generates an image based on a text prompt.",
                    parameters: z.object({
                      prompt: z
                        .string()
                        .describe("The text prompt for image generation"),
                      width: z
                        .number()
                        .describe("Width (integer 256 to 1280, default: 512)"),
                      height: z
                        .number()
                        .describe("Height (integer 256 to 1280, default: 512)")
                    }),
                    async execute({ prompt, width, height }) {
                      const generatedImage = await generateAndUploadImage({
                        prompt,
                        width,
                        height,
                        userId: profile.user_id
                      })

                      data.append({
                        type: "imageGenerated",
                        content: {
                          url: generatedImage.url,
                          prompt: prompt,
                          width: width,
                          height: height
                        }
                      })

                      return `<ai_generated_image>
                        prompt: ${prompt}
                        width: ${width}
                        height: ${height}
                        url: ${generatedImage.url}
                      </ai_generated_image>`
                    }
                  })
                })
                // python: tool({
                //   description:
                //     "Runs Python code. Only one execution is allowed per request.",
                //   parameters: z.object({
                //     pipInstallCommand: z
                //       .string()
                //       .describe(
                //         "Full pip install command to install packages (e.g., '!pip install package1 package2')"
                //       ),
                //     code: z
                //       .string()
                //       .describe("The Python code to execute in a single cell.")
                //   }),
                //   async execute({ pipInstallCommand, code }) {
                //     if (hasExecutedCode) {
                //       return {
                //         results:
                //           "Code execution skipped. Only one code cell can be executed per request.",
                //         runtimeError: null
                //       }
                //     }

                //     hasExecutedCode = true
                //     const execOutput = await executePythonCode(
                //       profile.user_id,
                //       code,
                //       pipInstallCommand
                //     )
                //     const { results, error: runtimeError } = execOutput

                //     return {
                //       results,
                //       runtimeError
                //     }
                //   }
                // })
              }
            : undefined,
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
  const proModel = llmConfig.models.pentestgpt_pro_openrouter

  const selectedStandaloneQuestionModel =
    llmConfig.models.pentestgpt_standalone_question_openrouter

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

  if (selectedModel === "mistralai/mistral-nemo") {
    modelTemperature = 0.3
  }

  return {
    providerUrl,
    providerBaseUrl,
    providerApiKey,
    providerHeaders,
    selectedModel,
    selectedStandaloneQuestionModel,
    rateLimitCheckResult,
    similarityTopK,
    isPentestGPTPro,
    modelTemperature
  }
}
