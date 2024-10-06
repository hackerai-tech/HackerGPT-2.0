import { supabase } from "@/lib/supabase/browser-client"

export const getTeamMembersByTeamId = async (
  userId: string,
  email?: string,
  teamId?: string | null
) => {
  if (!teamId) {
    const { data: teamMember, error: teamMembersError } = await supabase
      .from("team_members")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (teamMembersError) {
      throw new Error(teamMembersError.message)
    }

    teamId = teamMember?.team_id
  }

  if (!teamId && email) {
    const { data: teamInvitation, error: teamInvitationError } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("invitee_email", email)
      .maybeSingle()

    if (teamInvitationError) {
      throw new Error(teamInvitationError.message)
    }

    teamId = teamInvitation?.team_id
  }

  if (!teamId) {
    throw new Error("Team not found")
  }

  console.log("teamId", teamId)
  const { data: teamData, error: teamError } = await supabase.rpc(
    "get_team_members",
    { p_team_id: teamId }
  )

  if (teamError) {
    console.error("Error getting team members", teamError)
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

export const inviteUserToTeam = async (
  teamId: string,
  teamName: string,
  email: string
) => {
  try {
    const { data, error } = await supabase.rpc("invite_user_to_team", {
      p_team_id: teamId,
      p_invitee_email: email
    })

    if (error) {
      if (
        error.message.includes(
          "User already has a team, subscription, or pending invitation"
        )
      ) {
        throw new Error("User already has a team or pending invitation")
      }
      throw error
    }

    // Only send invitation email if the RPC call was successful
    await sendInvitationEmail(email, teamName)

    return data
  } catch (error) {
    console.error("Error in inviteUserToTeam:", error)
    throw error
  }
}

async function sendInvitationEmail(email: string, teamName: string) {
  const { data, error } = await supabase.functions.invoke(
    "send-invitation-email",
    {
      body: { email, teamName }
    }
  )

  if (error) {
    console.error("Error sending invitation email:", error)
    throw new Error("Failed to send invitation email")
  }

  if (!data.success) {
    console.error("Failed to send invitation email:", data.error)
    throw new Error(data.error || "Failed to send invitation email")
  }
}

export const acceptTeamInvitation = async (invitationId: string) => {
  const { data, error } = await supabase.rpc("accept_team_invitation", {
    p_invitation_id: invitationId
  })

  if (error) throw error

  return data
}
