import { ChatSettings, LLM } from "@/types"
import { Tables } from "@/supabase/types"

export const validateChatSettings = (
  chatSettings: ChatSettings | null,
  modelData: LLM | undefined,
  profile: Tables<"profiles"> | null,
  selectedWorkspace: Tables<"workspaces"> | null,
  isContinuation: boolean,
  messageContent: string | null
) => {
  if (!chatSettings) throw new Error("Chat settings not found")
  if (!modelData) throw new Error("Model not found")
  if (!profile) throw new Error("Profile not found")
  if (!selectedWorkspace) throw new Error("Workspace not found")
  if (!isContinuation && !messageContent)
    throw new Error("Message content not found")
}
