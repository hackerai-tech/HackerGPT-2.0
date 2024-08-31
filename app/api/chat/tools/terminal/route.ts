import { ServerRuntime } from "next"
import { terminalExecutor } from "@/lib/tools/terminal-executor"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { isPremiumUser } from "@/lib/server/subscription-utils"
import { ratelimit } from "@/lib/server/ratelimiter"
import { epochTimeToNaturalLanguage } from "@/lib/utils"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  try {
    const { command } = await request.json()

    if (!command) {
      return new Response("Command is required", { status: 400 })
    }

    const profile = await getAIProfile()
    const isPremium = await isPremiumUser(profile.user_id)

    if (!isPremium) {
      return new Response(
        "Access Denied: This feature is exclusive to Pro members. Please upgrade to a Pro account to access the terminal.",
        { status: 403 }
      )
    }

    const rateLimitResult = await ratelimit(profile.user_id, "terminal")
    if (!rateLimitResult.allowed) {
      const waitTime = epochTimeToNaturalLanguage(
        rateLimitResult.timeRemaining!
      )
      const errorMessage = `Oops! It looks like you've reached the limit for terminal commands.\nTo ensure fair usage for all users, please wait ${waitTime} before trying again.`
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      })
    }

    const response = await terminalExecutor({
      userID: profile.user_id,
      command
    })

    return response
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500
    })
  }
}
