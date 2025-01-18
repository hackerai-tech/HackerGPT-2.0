import { createClient } from "@/lib/supabase/server"

export async function getServerUserAndProfile() {
  "use server"

  const supabase = await createClient()

  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    throw new Error("User not found")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    throw new Error("Profile not found")
  }

  return { user, profile }
}

export async function getServerProfile() {
  "use server"

  const { profile } = await getServerUserAndProfile()
  return profile
}

export async function getAIProfile() {
  "use server"

  const supabase = await createClient()

  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    throw new Error("User not found")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, profile_context")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    throw new Error("Profile not found")
  }

  return profile
}
