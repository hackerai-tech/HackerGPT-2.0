import { supabase } from "@/lib/supabase/browser-client"

export const getTeamMembersByTeamId = async (
  userId: string,
  teamId?: string | null
) => {
  if (!teamId) {
    const { data: teamMember, error: teamMembersError } = await supabase
      .from("team_members")
      .select("*")
      .eq("user_id", userId)
      .single()
    if (teamMembersError) {
      if (teamMembersError.code === "PGRST116") {
        return null
      }
      throw new Error(teamMembersError.message)
    }

    teamId = teamMember.team_id
  }

  const { data: teamData, error: teamError } = await supabase.rpc(
    "get_team_members",
    { p_team_id: teamId }
  )

  if (teamError) {
    if (teamError.code === "PGRST116") {
      return null
    }
    throw new Error(teamError.message)
  }

  return teamData
}

export const removeUserFromTeam = async (teamId: string, email: string) => {
  const { data, error } = await supabase.rpc("remove_user_from_team", {
    p_team_id: teamId,
    p_user_email: email
  })

  if (error) {
    throw error
  }

  return data
}

export const inviteUserToTeam = async (teamId: string, email: string) => {
  const { data, error } = await supabase.rpc("invite_user_to_team", {
    p_team_id: teamId,
    p_invitee_email: email
  })

  if (error) throw error

  return data
}
