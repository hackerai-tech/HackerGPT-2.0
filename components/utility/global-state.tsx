"use client"

import { PentestGPTContext } from "@/context/context"
import { getProfileByUserId } from "@/db/profile"
import {
  getSubscriptionByTeamId,
  getSubscriptionByUserId
} from "@/db/subscriptions"
import { getWorkspacesByUserId } from "@/db/workspaces"
import { getTeamMembersByTeamId } from "@/db/teams"
import { fetchHostedModels } from "@/lib/models/fetch-models"
import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"
import {
  ChatFile,
  ChatMessage,
  ChatSettings,
  ContentType,
  LLM,
  MessageImage,
  SubscriptionStatus
} from "@/types"
import { PluginID } from "@/types/plugins"
import { useRouter } from "next/navigation"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useLocalStorageState } from "@/lib/hooks/use-local-storage-state"
import { ProcessedTeamMember } from "@/lib/team-utils"
import { User } from "@supabase/supabase-js"
import { useSearchParams } from "next/navigation"

interface GlobalStateProps {
  children: React.ReactNode
}

export const GlobalState: FC<GlobalStateProps> = ({ children }) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  // USER STORE
  const [user, setUser] = useState<User | null>(null)

  // PROFILE STORE
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null)

  // CONTENT TYPE STORE
  const [contentType, setContentType] = useState<ContentType>("chats")

  // SUBSCRIPTION STORE
  const [subscription, setSubscription] =
    useState<Tables<"subscriptions"> | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>("free")
  const [teamMembers, setTeamMembers] = useState<ProcessedTeamMember[] | null>(
    null
  )
  const [membershipData, setMembershipData] =
    useState<ProcessedTeamMember | null>(null)
  // ITEMS STORE
  const [chats, setChats] = useState<Tables<"chats">[]>([])
  const [files, setFiles] = useState<Tables<"files">[]>([])
  const [workspaces, setWorkspaces] = useState<Tables<"workspaces">[]>([])

  // MODELS STORE
  const [envKeyMap, setEnvKeyMap] = useState<Record<string, boolean>>({})
  const [availableHostedModels, setAvailableHostedModels] = useState<LLM[]>([])

  // WORKSPACE STORE
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<Tables<"workspaces"> | null>(null)

  // PASSIVE CHAT STORE
  const [userInput, setUserInput] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [temporaryChatMessages, setTemporaryChatMessages] = useState<
    ChatMessage[]
  >([])
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    model: "mistral-medium",
    includeProfileContext: false,
    embeddingsProvider: "openai"
  })
  const [selectedChat, setSelectedChat] = useState<Tables<"chats"> | null>(null)

  // ACTIVE CHAT STORE
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [firstTokenReceived, setFirstTokenReceived] = useState<boolean>(false)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  // ENHANCE MENU STORE
  const [isEnhancedMenuOpen, setIsEnhancedMenuOpen] = useLocalStorageState(
    "isEnhancedMenuOpen",
    true
  )
  const [selectedPluginType, setSelectedPluginType] = useState("")
  const [selectedPlugin, setSelectedPlugin] = useState(PluginID.NONE)

  // CHAT INPUT COMMAND STORE
  const [slashCommand, setSlashCommand] = useState("")
  const [isAtPickerOpen, setIsAtPickerOpen] = useState(false)
  const [atCommand, setAtCommand] = useState("")
  const [toolCommand, setToolCommand] = useState("")
  const [focusFile, setFocusFile] = useState(false)

  // ATTACHMENTS STORE
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([])
  const [chatImages, setChatImages] = useState<MessageImage[]>([])
  const [newMessageFiles, setNewMessageFiles] = useState<ChatFile[]>([])
  const [newMessageImages, setNewMessageImages] = useState<MessageImage[]>([])
  const [showFilesDisplay, setShowFilesDisplay] = useState<boolean>(false)

  // RETIEVAL STORE
  const [useRetrieval, setUseRetrieval] = useState<boolean>(false)
  const [sourceCount, setSourceCount] = useState<number>(4)

  // TOOL STORE
  const [toolInUse, setToolInUse] = useState<string>("none")

  // Define the isMobile state
  const [isMobile, setIsMobile] = useState<boolean>(false)

  // Define is ready to chat state
  const [isReadyToChat, setIsReadyToChat] = useState<boolean>(true)

  // SIDEBAR
  const [showSidebar, setShowSidebar] = useLocalStorageState(
    "showSidebar",
    false
  )

  // Audio
  const [currentPlayingMessageId, setCurrentPlayingMessageId] = useState<
    string | null
  >(null)
  const [isMicSupported, setIsMicSupported] = useState(true)

  // Terminal output setting
  const [showTerminalOutput, setShowTerminalOutput] =
    useLocalStorageState<boolean>("showTerminalOutput", true)

  // TEMPORARY CHAT STORE
  const [isTemporaryChat, setIsTemporaryChat] = useState(false)

  useEffect(() => {
    setIsTemporaryChat(searchParams.get("temporary-chat") === "true")
  }, [searchParams])

  // Handle window resize to update isMobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640)
    }

    // Set initial value
    setIsMobile(window.innerWidth <= 640)

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const profile = await fetchStartingData()

      if (profile) {
        const hostedModelRes = await fetchHostedModels()
        if (!hostedModelRes) return

        setEnvKeyMap(hostedModelRes.envKeyMap)
        setAvailableHostedModels(hostedModelRes.hostedModels)
      }
    })()
  }, [])

  const updateSubscription = useCallback(
    (newSubscription: Tables<"subscriptions"> | null) => {
      setSubscription(newSubscription)
      if (newSubscription) {
        setSubscriptionStatus(newSubscription.plan_type as SubscriptionStatus)
      } else {
        setSubscriptionStatus("free")
      }
    },
    []
  )

  const isPremiumSubscription = useMemo(
    () => subscriptionStatus !== "free",
    [subscriptionStatus]
  )

  const fetchStartingData = async () => {
    const {
      data: { user: userFromAuth }
    } = await supabase.auth.getUser()

    if (userFromAuth) {
      setUser(userFromAuth)

      const profile = await getProfileByUserId(userFromAuth.id)
      setProfile(profile)

      if (!profile.has_onboarded) {
        return router.push("/setup")
      }

      const subscription = await getSubscriptionByUserId(userFromAuth.id)
      updateSubscription(subscription)

      const workspaces = await getWorkspacesByUserId(userFromAuth.id)
      setWorkspaces(workspaces)

      const members = await getTeamMembersByTeamId(
        userFromAuth.id,
        userFromAuth.email,
        subscription?.team_id
      )

      const membershipData = members?.find(
        member =>
          member.member_user_id === userFromAuth.id ||
          member.invitee_email === userFromAuth.email
      )

      if (membershipData?.invitation_status !== "rejected") {
        setTeamMembers(members)
        setMembershipData(membershipData ?? null)
      } else {
        setTeamMembers(null)
        setMembershipData(null)
      }

      if (
        (!subscription || subscription.status !== "active") &&
        members &&
        members.length > 0
      ) {
        const subscription = await getSubscriptionByTeamId(members[0].team_id)
        updateSubscription(subscription)
      }

      return profile
    }
  }

  const refreshTeamMembers = async () => {
    await fetchStartingData()
  }

  return (
    <PentestGPTContext.Provider
      value={{
        // USER STORE
        user,

        // PROFILE STORE
        profile,
        setProfile,

        // CONTENT TYPE STORE
        contentType,
        setContentType,

        // SUBSCRIPTION STORE
        subscription,
        setSubscription,
        subscriptionStatus,
        setSubscriptionStatus,
        updateSubscription,
        isPremiumSubscription,
        teamMembers,
        refreshTeamMembers,
        membershipData,

        // ITEMS STORE
        chats,
        setChats,
        files,
        setFiles,
        workspaces,
        setWorkspaces,

        // MODELS STORE
        envKeyMap,
        setEnvKeyMap,
        availableHostedModels,
        setAvailableHostedModels,

        // WORKSPACE STORE
        selectedWorkspace,
        setSelectedWorkspace,

        // PASSIVE CHAT STORE
        userInput,
        setUserInput,
        chatMessages,
        setChatMessages,
        temporaryChatMessages,
        setTemporaryChatMessages,
        chatSettings,
        setChatSettings,
        selectedChat,
        setSelectedChat,

        // ACTIVE CHAT STORE
        isGenerating,
        setIsGenerating,
        firstTokenReceived,
        setFirstTokenReceived,
        abortController,
        setAbortController,

        // ENHANCE MENU STORE
        isEnhancedMenuOpen,
        setIsEnhancedMenuOpen,
        selectedPluginType,
        setSelectedPluginType,
        selectedPlugin,
        setSelectedPlugin,

        // CHAT INPUT COMMAND STORE
        slashCommand,
        setSlashCommand,
        isAtPickerOpen,
        setIsAtPickerOpen,
        atCommand,
        setAtCommand,
        toolCommand,
        setToolCommand,
        focusFile,
        setFocusFile,

        // ATTACHMENT STORE
        chatFiles,
        setChatFiles,
        chatImages,
        setChatImages,
        newMessageFiles,
        setNewMessageFiles,
        newMessageImages,
        setNewMessageImages,
        showFilesDisplay,
        setShowFilesDisplay,

        // RETRIEVAL STORE
        useRetrieval,
        setUseRetrieval,
        sourceCount,
        setSourceCount,

        // TOOL STORE
        toolInUse,
        setToolInUse,

        isMobile,

        // Is ready to chat state
        isReadyToChat,
        setIsReadyToChat,

        // Sidebar
        showSidebar,
        setShowSidebar,

        // Terminal output setting
        showTerminalOutput,
        setShowTerminalOutput,

        // Audio
        currentPlayingMessageId,
        setCurrentPlayingMessageId,
        isMicSupported,
        setIsMicSupported,

        // TEMPORARY CHAT STORE
        isTemporaryChat
      }}
    >
      {children}
    </PentestGPTContext.Provider>
  )
}
