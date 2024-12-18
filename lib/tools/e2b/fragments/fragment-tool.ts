import { toVercelChatMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { createOpenAI } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { fragmentSchema } from "./fragment-schema"
import { toPrompt } from "./prompt"
import templates from "./templates"
import { executeFragment } from "./sandbox-execution"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

interface FragmentsToolConfig {
  chatSettings: any
  messages: any[]
  profile: any
  dataStream: any
}

export async function executeFragments({
  config
}: {
  config: FragmentsToolConfig
}) {
  const { messages, profile, dataStream } = config

  // Check subscription
  const subscriptionInfo = await getSubscriptionInfo(profile.user_id)
  if (!subscriptionInfo.isPremium) {
    return new Response(
      "Access Denied: This feature is exclusive to Pro and Team members. Please upgrade your account to access the fragment tool.",
      { status: 403 }
    )
  }

  const rateLimitCheck = await checkRatelimitOnApi(profile.user_id, "fragments")
  if (rateLimitCheck) {
    return rateLimitCheck.response
  }

  const openaiClient = createOpenAI({
    baseURL: llmConfig.openai.baseURL,
    apiKey: llmConfig.openai.apiKey
  })

  const { object: finalObjectPromise, partialObjectStream } = streamObject({
    model: openaiClient("gpt-4o"),
    schema: fragmentSchema,
    system: toPrompt(templates),
    messages: toVercelChatMessages(messages, true)
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
      dataStream.writeData({
        type: "fragment",
        [key]: partialObject[key as keyof typeof partialObject]
      })
    }
  }

  const finalObject = await finalObjectPromise

  dataStream.writeData({
    type: "fragment",
    sandboxExecution: "started"
  })

  const sandboxData = await executeFragment(
    finalObject,
    profile.user_id,
    5 * 60 * 1000
  )

  dataStream.writeData({
    type: "fragment",
    sandboxResult: sandboxData,
    sandboxExecution: "completed"
  })

  return "Fragment execution completed"
}
