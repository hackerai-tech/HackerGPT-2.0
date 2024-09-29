import { createSupabaseAdminClient } from "./server-utils"
import { SubscriptionStatus, SubscriptionInfo } from "@/types"

export async function getSubscriptionInfo(
  userId: string
): Promise<SubscriptionInfo> {
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: subscriptions, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")

  if (error) {
    throw new Error(error.message)
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { isPremium: false, status: "free" }
  }

  // Determine the highest tier subscription
  const highestTier = subscriptions.reduce((highest, current) => {
    if (current.plan_type === "team") return "team"
    if (current.plan_type === "pro" && highest !== "team") return "pro"
    return highest
  }, "free" as SubscriptionStatus)

  return {
    isPremium: highestTier !== "free",
    status: highestTier
  }
}
