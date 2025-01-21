import { toVercelChatMessages } from "@/lib/build-prompt"
import { createOpenAI } from "@ai-sdk/openai"
import { streamObject } from "ai"
import { fragmentSchema } from "./fragment-schema"
import { toPrompt } from "./prompt"
import templates from "./templates"
import { executeFragment } from "./sandbox-execution"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"
import { ratelimit } from "@/lib/server/ratelimiter"
import { epochTimeToNaturalLanguage } from "@/lib/utils"

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

  const subscriptionInfo = await getSubscriptionInfo(profile.user_id)
  if (!subscriptionInfo.isPremium) {
    dataStream.writeData({
      type: "error",
      content:
        "Access Denied: This feature is exclusive to Pro and Team members."
    })
    return "Access Denied: Premium feature only"
  }

  const rateLimitResult = await ratelimit(
    profile.user_id,
    "fragments",
    subscriptionInfo
  )
  if (!rateLimitResult.allowed) {
    const waitTime = epochTimeToNaturalLanguage(rateLimitResult.timeRemaining!)
    dataStream.writeData({
      type: "error",
      content: `⚠️ You've reached the limit for artifacts usage.\n\nTo ensure fair usage for all users, please wait ${waitTime} before trying again.`
    })
    return "Rate limit exceeded"
  }

  const openaiClient = createOpenAI()

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
