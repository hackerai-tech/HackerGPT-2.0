import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { mistral } from "@ai-sdk/mistral"
import { generateObject } from "ai"
import { DEFAULT_TITLE_GENERATION_PROMPT_TEMPLATE } from "@/lib/backend-config"
import llmConfig from "@/lib/models/llm/llm-config"
import { z } from "zod"

export const runtime = "edge"
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

    // Get user profile and check rate limit
    const profile = await getAIProfile()
    const rateLimitCheckResult = await checkRatelimitOnApi(
      profile.user_id,
      "generate-title"
    )
    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    // Simplified messages to reduce payload
    const simplifiedMessages = messages.slice(-2) // Only use last 2 messages

    const {
      object: { title }
    } = await generateObject({
      model: mistral(
        llmConfig.models.pentestgpt_small || "mistral-small-latest"
      ),
      schema: z.object({
        title: z.string().describe("The generated title (3-5 words)")
      }),
      messages: [
        {
          role: "user",
          content: DEFAULT_TITLE_GENERATION_PROMPT_TEMPLATE(simplifiedMessages)
        }
      ],
      abortSignal: request.signal,
      maxTokens: 50
    })

    return new Response(JSON.stringify({ name: title }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    })
  } catch (error: any) {
    console.error("Error generating chat name:", error)
    return new Response(
      JSON.stringify({ message: "Failed to generate chat name" }),
      { status: 500 }
    )
  }
}
