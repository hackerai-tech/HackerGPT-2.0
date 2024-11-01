import { SubscriptionInfo } from "@/types"
import { createSupabaseAdminClient } from "./server-utils"

export async function getSubscriptionInfo(
  userId: string
): Promise<SubscriptionInfo> {
  const supabaseAdmin = createSupabaseAdminClient()

  // Check for team membership
  const { data: teamMemberships, error: teamError } = await supabaseAdmin
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId)

  if (teamError) {
    throw new Error(teamError.message)
  }

  // If user is a team member, return team subscription info
  if (teamMemberships && teamMemberships.length > 0) {
    return {
      isPremium: true,
      isTeam: true,
      status: "team"
    }
  }

  const { data: subscriptions, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")

  if (error) {
    throw new Error(error.message)
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { isPremium: false, isTeam: false, status: "free" }
  }

  return {
    isPremium: true,
    isTeam: false,
    status: "pro"
  }
}
