import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"
import { executeFragment } from "@/lib/tools/e2b/fragments/sandbox-execution"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

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
      "fragments-reload",
      subscriptionInfo
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
