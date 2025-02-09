import { Tables } from "@/supabase/types"
import { ChatMessage, LLMID } from "."

export interface ChatSettings {
  model: LLMID
  includeProfileContext: boolean
}

export interface ChatPayload {
  chatSettings: ChatSettings
  chatMessages: ChatMessage[]
  messageFileItems: Tables<"file_items">[]
}

export interface ChatAPIPayload {
  chatSettings: ChatSettings
  messages: Tables<"messages">[]
}

export interface Message {
  role: Role
  content: string
}

export type Role = "assistant" | "user" | "system"

export type SubscriptionStatus = "free" | "pro" | "team"

export type SubscriptionInfo = {
  isPremium: boolean
  isTeam: boolean
  status: SubscriptionStatus
}
