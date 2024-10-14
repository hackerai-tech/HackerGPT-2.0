import { supabase } from "@/lib/supabase/browser-client"

export async function getSubscriptionByUserId(userId: string) {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()

  return subscription
}

export async function getSubscriptionByTeamId(teamId: string) {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "active")
    .maybeSingle()

  return subscription
}
