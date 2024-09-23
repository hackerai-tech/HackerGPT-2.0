import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"

import {
  replaceWordsInLastUserMessage
  //   updateSystemMessage
} from "@/lib/ai-helper"
import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { filterEmptyAssistantMessages } from "@/lib/build-prompt"
import { generateText } from "ai"
import { toVercelChatMessages } from "@/lib/build-prompt"
import { isPremiumUser } from "@/lib/server/subscription-utils"
import { createOpenAI } from "@ai-sdk/openai"

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
  try {
    const { messages } = await request.json()

    const profile = await getAIProfile()
    const isPremium = await isPremiumUser(profile.user_id)

    if (!isPremium) {
      return new Response(
        "Access Denied: This feature is exclusive to Pro members. Please upgrade to a Pro account to access the reason LLM.",
        { status: 403 }
      )
    }

    const rateLimitCheckResult = await checkRatelimitOnApi(
      profile.user_id,
      "gpt-4"
    )
    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    // OpenAI o1-mini doesn't support system messages
    // updateSystemMessage(
    //   messages,
    //   llmConfig.systemPrompts.reasonLLM,
    //   profile.profile_context
    // )
    filterEmptyAssistantMessages(messages)
    replaceWordsInLastUserMessage(messages)

    // Remove all system messages
    const filteredMessages = messages.filter(
      (msg: { role: string }) => msg.role !== "system"
    )

    const openai = createOpenAI({
      baseUrl: llmConfig.openai.baseUrl,
      apiKey: llmConfig.openai.apiKey
    })

    const { text } = await generateText({
      model: openai("o1-mini"),
      messages: toVercelChatMessages(filteredMessages)
    })

    return new Response(`0:${JSON.stringify(text)}\n`, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-vercel-ai-data-stream": "v1"
      }
    })
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
