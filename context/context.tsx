import { Tables } from "@/supabase/types"
import {
  ChatFile,
  ChatMessage,
  ChatSettings,
  LLM,
  MessageImage,
  SubscriptionStatus
} from "@/types"
import { PluginID } from "@/types/plugins"
import { Dispatch, SetStateAction, createContext, useContext } from "react"
import { ContentType } from "@/types"
import { ProcessedTeamMember } from "@/lib/team-utils"
import { User } from "@supabase/supabase-js"

interface PentestGPTContextType {
  // USER STORE
  user: User | null

  // PROFILE STORE
  profile: Tables<"profiles"> | null
  setProfile: Dispatch<SetStateAction<Tables<"profiles"> | null>>
  fetchStartingData: () => Promise<void>
  // CONTENT TYPE STORE
  contentType: ContentType
  setContentType: React.Dispatch<React.SetStateAction<ContentType>>

  // SUBSCRIPTION STORE
  subscription: Tables<"subscriptions"> | null
  setSubscription: Dispatch<SetStateAction<Tables<"subscriptions"> | null>>
  subscriptionStatus: SubscriptionStatus
  setSubscriptionStatus: Dispatch<SetStateAction<SubscriptionStatus>>
  updateSubscription: (newSubscription: Tables<"subscriptions"> | null) => void
  isPremiumSubscription: boolean
  teamMembers: ProcessedTeamMember[] | null
  refreshTeamMembers: () => Promise<void>
  membershipData: ProcessedTeamMember | null

  // ITEMS STORE
  chats: Tables<"chats">[]
  setChats: Dispatch<SetStateAction<Tables<"chats">[]>>
  files: Tables<"files">[]
  setFiles: Dispatch<SetStateAction<Tables<"files">[]>>
  // workspaces: Tables<"workspaces">[]
  // setWorkspaces: Dispatch<SetStateAction<Tables<"workspaces">[]>>

  // MODELS STORE
  envKeyMap: Record<string, boolean>
  setEnvKeyMap: Dispatch<SetStateAction<Record<string, boolean>>>
  availableHostedModels: LLM[]
  setAvailableHostedModels: Dispatch<SetStateAction<LLM[]>>

  // WORKSPACE STORE
  selectedWorkspace: Tables<"workspaces"> | null
  setSelectedWorkspace: Dispatch<SetStateAction<Tables<"workspaces"> | null>>

  // PASSIVE CHAT STORE
  userInput: string
  setUserInput: Dispatch<SetStateAction<string>>
  chatMessages: ChatMessage[]
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  chatSettings: ChatSettings | null
  setChatSettings: Dispatch<SetStateAction<ChatSettings>>
  selectedChat: Tables<"chats"> | null
  setSelectedChat: Dispatch<SetStateAction<Tables<"chats"> | null>>
  temporaryChatMessages: ChatMessage[]
  setTemporaryChatMessages: Dispatch<SetStateAction<ChatMessage[]>>

  // ACTIVE CHAT STORE
  abortController: AbortController | null
  setAbortController: Dispatch<SetStateAction<AbortController | null>>

  // ATTACHMENTS STORE
  chatFiles: ChatFile[]
  setChatFiles: Dispatch<SetStateAction<ChatFile[]>>
  chatImages: MessageImage[]
  setChatImages: Dispatch<SetStateAction<MessageImage[]>>
  newMessageFiles: ChatFile[]
  setNewMessageFiles: Dispatch<SetStateAction<ChatFile[]>>
  newMessageImages: MessageImage[]
  setNewMessageImages: Dispatch<SetStateAction<MessageImage[]>>
  showFilesDisplay: boolean
  setShowFilesDisplay: Dispatch<SetStateAction<boolean>>

  // RETRIEVAL STORE
  useRetrieval: boolean
  setUseRetrieval: Dispatch<SetStateAction<boolean>>
  sourceCount: number
  setSourceCount: Dispatch<SetStateAction<number>>

  // Audio
  currentPlayingMessageId: string | null
  setCurrentPlayingMessageId: Dispatch<SetStateAction<string | null>>
  isMicSupported: boolean
  setIsMicSupported: Dispatch<SetStateAction<boolean>>

  // TEMPORARY CHAT STORE
  isTemporaryChat: boolean

  // Fetch Chat and Messages
  fetchChat: (chatId: string, workspaceId: string) => Promise<void>
  fetchMessages: (chatId: string, workspaceId: string) => Promise<void>
  loadMoreMessages: (chatId: string) => Promise<void>

  // Loading Messages States
  isLoadingMore: boolean
  allMessagesLoaded: boolean

  // User Email
  userEmail: string
  setUserEmail: (email: string) => void
}

export const PentestGPTContext = createContext<PentestGPTContextType>({
  // USER STORE
  user: null,

  // PROFILE STORE
  profile: null,
  setProfile: () => {},
  fetchStartingData: async () => {},
  // CONTENT TYPE STORE
  contentType: "chats",
  setContentType: () => {},

  // SUBSCRIPTION STORE
  subscription: null,
  setSubscription: () => {},
  subscriptionStatus: "free",
  setSubscriptionStatus: () => {},
  updateSubscription: () => {},
  isPremiumSubscription: false,
  teamMembers: null,
  refreshTeamMembers: async () => {},
  membershipData: null,

  // ITEMS STORE
  chats: [],
  setChats: () => {},
  files: [],
  setFiles: () => {},
  // workspaces: [],
  // setWorkspaces: () => {},

  // MODELS STORE
  envKeyMap: {},
  setEnvKeyMap: () => {},
  availableHostedModels: [],
  setAvailableHostedModels: () => {},

  // WORKSPACE STORE
  selectedWorkspace: null,
  setSelectedWorkspace: () => {},

  // PASSIVE CHAT STORE
  userInput: "",
  setUserInput: () => {},
  selectedChat: null,
  setSelectedChat: () => {},
  chatMessages: [],
  setChatMessages: () => {},
  chatSettings: null,
  setChatSettings: () => {},
  temporaryChatMessages: [],
  setTemporaryChatMessages: () => {},

  // ACTIVE CHAT STORE
  abortController: null,
  setAbortController: () => {},

  // ATTACHMENTS STORE
  chatFiles: [],
  setChatFiles: () => {},
  chatImages: [],
  setChatImages: () => {},
  newMessageFiles: [],
  setNewMessageFiles: () => {},
  newMessageImages: [],
  setNewMessageImages: () => {},
  showFilesDisplay: false,
  setShowFilesDisplay: () => {},

  // RETRIEVAL STORE
  useRetrieval: false,
  setUseRetrieval: () => {},
  sourceCount: 4,
  setSourceCount: () => {},

  // Audio
  currentPlayingMessageId: null,
  setCurrentPlayingMessageId: () => {},
  isMicSupported: false,
  setIsMicSupported: () => {},

  // TEMPORARY CHAT STORE
  isTemporaryChat: false,

  // Loading Messages States
  isLoadingMore: false,
  allMessagesLoaded: false,

  // Fetch Chat and Messages
  fetchChat: async (chatId: string, workspaceId: string) => {},
  fetchMessages: async (chatId: string, workspaceId: string) => {},
  loadMoreMessages: async (chatId: string) => {},

  // User Email
  userEmail: "",
  setUserEmail: () => {}
})

export const usePentestGPT = () => useContext(PentestGPTContext)
