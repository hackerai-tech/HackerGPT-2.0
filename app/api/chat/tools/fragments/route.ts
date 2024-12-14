import { replaceWordsInLastUserMessage } from "@/lib/ai-helper"
import { filterEmptyAssistantMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"
import { fragmentSchema } from "@/lib/tools/e2b/fragments/fragment-schema"
import { toPrompt } from "@/lib/tools/e2b/fragments/prompt"
import { executeFragment } from "@/lib/tools/e2b/fragments/sandbox-execution"
import templates from "@/lib/tools/e2b/fragments/templates"
import { BuiltChatMessage } from "@/types/chat-message"
import { createOpenAI } from "@ai-sdk/openai"
import {
  experimental_createProviderRegistry as createProviderRegistry,
  streamObject
} from "ai"
import { ServerRuntime } from "next"

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

function messageToPrompt(message: BuiltChatMessage) {
  let result = '<Message role="' + message.role + '">\n'

  if (Array.isArray(message.content)) {
    result = message.content.map(content => {
      if (typeof content === 'object' && 'text' in content) {
        return content.text
      }
      return content
    }).join('')
  } else {
    result = message.content
  }
  return result + "</Message>\n"
}

function messagesToPrompt(messages: BuiltChatMessage[]) {
  return messages
    .map(messageToPrompt)
    .join("\n")
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()
    
    const profile = await getAIProfile()
    const subscriptionInfo = await getSubscriptionInfo(profile.user_id)

    if (!subscriptionInfo.isPremium) {
      return new Response(
        "Access Denied: This feature is exclusive to Pro and Team members. Please upgrade your account to access the fragment tool.",
        { status: 403 }
      )
    }

    const rateLimitCheck = await checkRatelimitOnApi(
      profile.user_id,
      "fragments"
    )
    if (rateLimitCheck) {
      return rateLimitCheck.response
    }

    filterEmptyAssistantMessages(messages)
    replaceWordsInLastUserMessage(messages)

    const openaiClient = createOpenAI({
      baseURL: llmConfig.openai.baseURL,
      apiKey: llmConfig.openai.apiKey
    })

    // custom provider with different model settings:
    const registry = createProviderRegistry({
      // register provider with prefix and custom setup:
      openai: openaiClient
    })

    const stream = new ReadableStream({
      async start(controller) {
        const enqueueChunk = (code: string, object: any) => {
          const chunk = `${code}:${JSON.stringify([
            {
              isFragment: true
            },
            object
          ])}\n`
          controller.enqueue(new TextEncoder().encode(chunk))
        }

        const { object: finalObjectPromise, partialObjectStream } =
          streamObject({
            model: registry.languageModel("openai:gpt-4o"),
            schema: fragmentSchema,
            prompt:
              toPrompt(templates) +
              "Execute the task described in the conversation bellow:\n\n" +
              messagesToPrompt(messages)
          })

        const keysAlreadySeen = new Set<string>()
        const transmittingKeys = new Set<string>()
        for await (const partialObject of partialObjectStream) {
          let clearTransmittingKeys = false
          const keys = Object.keys(partialObject)
          for (const key of keys) {
            if (keysAlreadySeen.has(key)) {
              continue
            }
            keysAlreadySeen.add(key)
            if (!clearTransmittingKeys) {
              clearTransmittingKeys = true
              transmittingKeys.clear()
            }
            transmittingKeys.add(key)
          }

          for (const key of transmittingKeys) {
            enqueueChunk("2", {
              [key]: partialObject[key as keyof typeof partialObject]
            })
          }
        }

        const finalObject = await finalObjectPromise

        enqueueChunk("2", {
          sandboxExecution: "starting"
        })

        const sandboxData = await executeFragment(
          finalObject,
          profile.user_id,
          5 * 60 * 1000
        )

        enqueueChunk("2", {
          sandboxResult: sandboxData,
          sandboxExecution: "completed"
        })

        controller.enqueue(
          new TextEncoder().encode(`d:{"finishReason":"stop"}\n`)
        )

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked"
      }
    })
  } catch (error) {
    console.error("Fragment execution error:", error)
    return new Response("An error occurred while processing your request", {
      status: 500
    })
  }
}
