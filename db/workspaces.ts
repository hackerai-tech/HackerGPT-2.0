import { supabase } from "@/lib/supabase/browser-client"

export const getHomeWorkspaceByUserId = async (
  userId: string
): Promise<string> => {
  if (!userId) {
    throw new Error("User ID is required")
  }

  const { data: homeWorkspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .eq("is_home", true)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!homeWorkspace) {
    throw new Error("Home workspace not found")
  }

  return homeWorkspace.id
}

export const getWorkspaceById = async (workspaceId: string) => {
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned, workspace not found
      return null
    }
    // For other types of errors, we still throw
    throw new Error(`Error fetching workspace: ${error.message}`)
  }

  return workspace
}
