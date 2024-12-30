export enum TeamRole {
  ADMIN = "admin",
  OWNER = "owner",
  MEMBER = "member"
}

export interface ProcessedTeamMember {
  team_id: string
  team_name: string
  member_id: string
  member_role: string
  member_user_id: string
  member_created_at: string
  invitation_id: string
  invitee_email: string
  invitation_status: string
  invitation_created_at: string
  invitation_updated_at: string
}

export const isTeamAdmin = (
  membershipData: ProcessedTeamMember | null
): boolean => {
  return (
    membershipData?.member_role === TeamRole.ADMIN ||
    membershipData?.member_role === TeamRole.OWNER
  )
}

export const roleToLabel = (role: TeamRole | string): string => {
  switch (role) {
    case TeamRole.ADMIN:
      return "Admin"
    case TeamRole.OWNER:
      return "Owner"
    default:
      return "Member"
  }
}
