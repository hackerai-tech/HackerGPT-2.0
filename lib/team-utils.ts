import { Tables } from "@/supabase/types"

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
