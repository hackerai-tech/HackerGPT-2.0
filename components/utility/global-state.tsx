// TODO: Separate into multiple contexts, keeping simple for now

"use client"

import { PentestGPTContext } from "@/context/context"
import { getProfileByUserId } from "@/db/profile"
import { getWorkspaceImageFromStorage } from "@/db/storage/workspace-images"
import {
  getSubscriptionByTeamId,
  getSubscriptionByUserId
} from "@/db/subscriptions"
import { getWorkspacesByUserId } from "@/db/workspaces"
import { getTeamMembersByTeamId } from "@/db/teams"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
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
  SubscriptionStatus,
  WorkspaceImage
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
  const [workspaceImages, setWorkspaceImages] = useState<WorkspaceImage[]>([])

  // PASSIVE CHAT STORE
  const [userInput, setUserInput] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
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
    const session = (await supabase.auth.getSession()).data.session

    if (session) {
      const userFromSession = session.user
      setUser(userFromSession)

      const profile = await getProfileByUserId(userFromSession.id)
      setProfile(profile)

      if (!profile.has_onboarded) {
        return router.push("/setup")
      }

      const subscription = await getSubscriptionByUserId(userFromSession.id)
      updateSubscription(subscription)

      const workspaces = await getWorkspacesByUserId(userFromSession.id)
      setWorkspaces(workspaces)

      const members = await getTeamMembersByTeamId(
        userFromSession.id,
        userFromSession.email,
        subscription?.team_id
      )

      const membershipData = members?.find(
        member =>
          member.member_user_id === userFromSession.id ||
          member.invitee_email === userFromSession.email
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

      for (const workspace of workspaces) {
        let workspaceImageUrl = ""

        if (workspace.image_path) {
          workspaceImageUrl =
            (await getWorkspaceImageFromStorage(workspace.image_path)) || ""
        }

        if (workspaceImageUrl) {
          const response = await fetch(workspaceImageUrl)
          const blob = await response.blob()
          const base64 = await convertBlobToBase64(blob)

          setWorkspaceImages(prev => [
            ...prev,
            {
              workspaceId: workspace.id,
              path: workspace.image_path,
              base64: base64,
              url: workspaceImageUrl
            }
          ])
        }
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
        workspaceImages,
        setWorkspaceImages,

        // PASSIVE CHAT STORE
        userInput,
        setUserInput,
        chatMessages,
        setChatMessages,
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

        // TEMPORARY CHAT STORE
        isTemporaryChat
      }}
    >
      {children}
    </PentestGPTContext.Provider>
  )
}
