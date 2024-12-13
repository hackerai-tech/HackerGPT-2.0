import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"
import { executeFragment } from "@/lib/tools/e2b/fragments/sandbox-execution"
import { ServerRuntime } from "next"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

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
    const { fragment } = await request.json()

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

    const sandboxData = await executeFragment(
      fragment,
      profile.user_id,
      5 * 60 * 1000
    )

    return new Response(JSON.stringify({ sandboxResult: sandboxData }), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Fragment reload error:", error)
    return new Response("An error occurred while reloading the sandbox", {
      status: 500
    })
  }
}
