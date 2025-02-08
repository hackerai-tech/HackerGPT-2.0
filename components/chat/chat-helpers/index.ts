// Only used in use-chat-handler.tsx to keep it clean

import { AlertAction } from "@/context/alert-context"
import { createChatFiles } from "@/db/chat-files"
import { createChat } from "@/db/chats"
import { Tables } from "@/supabase/types"
import {
  ChatFile,
  ChatMessage,
  ChatPayload,
  ChatSettings,
  LLM,
  MessageImage,
  PluginID
} from "@/types"
import React from "react"
import { toast } from "sonner"
import { buildFinalMessages } from "@/lib/build-prompt"
import { Fragment } from "@/lib/tools/e2b/fragments/types"
import { processResponse } from "./stream-processor"

export * from "./validation"
export * from "./image-handlers"
export * from "./retrieval"
export * from "./create-messages"
export * from "./create-temp-messages"

export const handleHostedChat = async (
  payload: ChatPayload,
  profile: Tables<"profiles">,
  modelData: LLM,
  tempAssistantChatMessage: ChatMessage,
  isRegeneration: boolean,
  isRagEnabled: boolean,
  isContinuation: boolean,
  isTerminalContinuation: boolean,
  newAbortController: AbortController,
  chatImages: MessageImage[],
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>,
  alertDispatch: React.Dispatch<AlertAction>,
  selectedPlugin: PluginID,
  setFragment: (fragment: Fragment | null, chatMessage?: ChatMessage) => void
) => {
  const { provider } = modelData
  let apiEndpoint = `/api/chat/${provider}`

  if (isTerminalContinuation || selectedPlugin === PluginID.TERMINAL) {
    apiEndpoint = "/api/chat/openai"
    setToolInUse(PluginID.TERMINAL)
    selectedPlugin = PluginID.TERMINAL
  } else if (selectedPlugin === PluginID.REASONING) {
    apiEndpoint = "/api/chat/openai"
    setToolInUse(PluginID.REASONING)
  } else if (selectedPlugin === PluginID.REASONING_WEB_SEARCH) {
    apiEndpoint = "/api/chat/openai"
    setToolInUse(PluginID.REASONING_WEB_SEARCH)
  } else if (selectedPlugin === PluginID.ARTIFACTS) {
    apiEndpoint = "/api/chat/tools/fragments"
    setToolInUse(PluginID.ARTIFACTS)
  } else {
    setToolInUse(
      isRagEnabled && provider !== "openai"
        ? "Enhanced Search"
        : selectedPlugin && selectedPlugin !== PluginID.NONE
          ? selectedPlugin
          : "none"
    )
  }

  const formattedMessages = await buildFinalMessages(
    payload,
    chatImages,
    isRagEnabled
  )
  const chatSettings = payload.chatSettings

  let requestBody: any

  if (provider === "openai" || isTerminalContinuation) {
    requestBody = {
      messages: formattedMessages,
      chatSettings,
      isTerminalContinuation,
      selectedPlugin
    }
  } else {
    requestBody = {
      messages: formattedMessages,
      chatSettings: chatSettings,
      isRetrieval:
        payload.messageFileItems && payload.messageFileItems.length > 0,
      isContinuation,
      isRagEnabled,
      selectedPlugin
    }
  }

  const chatResponse = await fetchChatResponse(
    apiEndpoint,
    requestBody,
    newAbortController,
    setIsGenerating,
    setChatMessages,
    alertDispatch
  )

  const lastMessage =
    isRegeneration || isContinuation
      ? payload.chatMessages[
          payload.chatMessages.length - (isContinuation ? 2 : 1)
        ]
      : tempAssistantChatMessage

  return processResponse(
    chatResponse,
    lastMessage,
    newAbortController,
    setFirstTokenReceived,
    setChatMessages,
    setToolInUse,
    requestBody,
    setIsGenerating,
    alertDispatch,
    selectedPlugin,
    isContinuation,
    setFragment
  )
}

export const handleHostedPluginsChat = async (
  payload: ChatPayload,
  profile: Tables<"profiles">,
  modelData: LLM,
  tempAssistantChatMessage: ChatMessage,
  isRegeneration: boolean,
  isTerminalContinuation: boolean,
  newAbortController: AbortController,
  newMessageImages: MessageImage[],
  chatImages: MessageImage[],
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>,
  alertDispatch: React.Dispatch<AlertAction>,
  selectedPlugin: PluginID,
  isContinuation: boolean,
  setFragment: (fragment: Fragment | null, chatMessage?: ChatMessage) => void
) => {
  const apiEndpoint = "/api/chat/plugins"

  const formattedMessages = await buildFinalMessages(payload, chatImages)

  const requestBody: any = {
    messages: formattedMessages,
    payload: payload,
    selectedPlugin: selectedPlugin,
    isTerminalContinuation: isTerminalContinuation
  }

  if (selectedPlugin && selectedPlugin !== PluginID.NONE) {
    setToolInUse(selectedPlugin)
  }

  const chatResponse = await fetchChatResponse(
    apiEndpoint,
    requestBody,
    newAbortController,
    setIsGenerating,
    setChatMessages,
    alertDispatch
  )

  const lastMessage =
    isRegeneration || isTerminalContinuation
      ? payload.chatMessages[
          payload.chatMessages.length - (isTerminalContinuation ? 2 : 1)
        ]
      : tempAssistantChatMessage

  return processResponse(
    chatResponse,
    lastMessage,
    newAbortController,
    setFirstTokenReceived,
    setChatMessages,
    setToolInUse,
    requestBody,
    setIsGenerating,
    alertDispatch,
    selectedPlugin,
    isContinuation,
    setFragment
  )
}

export const fetchChatResponse = async (
  url: string,
  body: object,
  controller: AbortController,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  alertDispatch: React.Dispatch<AlertAction>
) => {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    signal: controller.signal
  })

  if (!response.ok) {
    if (response.status === 500) {
      const errorData = await response.json()
      toast.error(errorData.message)
    }

    const errorData = await response.json()
    if (response.status === 429 && errorData && errorData.timeRemaining) {
      alertDispatch({
        type: "SHOW",
        payload: { message: errorData.message, title: "Usage Cap Error" }
      })
    } else {
      const errorData = await response.json()
      toast.error(errorData.message)
    }

    setIsGenerating(false)
    setChatMessages(prevMessages => prevMessages.slice(0, -2))
  }

  return response
}

export const handleCreateChat = async (
  chatSettings: ChatSettings,
  profile: Tables<"profiles">,
  selectedWorkspace: Tables<"workspaces">,
  messageContent: string,
  newMessageFiles: ChatFile[],
  finishReason: string,
  setSelectedChat: React.Dispatch<React.SetStateAction<Tables<"chats"> | null>>,
  setChats: React.Dispatch<React.SetStateAction<Tables<"chats">[]>>,
  setChatFiles: React.Dispatch<React.SetStateAction<ChatFile[]>>
) => {
  // Create chat first with a temporary chat name
  const createdChat = await createChat({
    user_id: profile.user_id,
    workspace_id: selectedWorkspace.id,
    include_profile_context: chatSettings.includeProfileContext,
    model: chatSettings.model,
    name: messageContent.substring(0, 100),
    finish_reason: finishReason
  })

  setSelectedChat(createdChat)
  setChats(chats => [createdChat, ...chats])

  // Handle file creation
  await createChatFiles(
    newMessageFiles.map(file => ({
      user_id: profile.user_id,
      chat_id: createdChat.id,
      file_id: file.id
    }))
  )

  setChatFiles(prev => [...prev, ...newMessageFiles])

  return createdChat
}

export const generateChatName = async (
  messages: { message: { content: string; role: string } }[]
) => {
  try {
    const response = await fetch("/api/chat/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.name || null
  } catch (error) {
    console.error("Error generating chat name:", error)
    return null
  }
}
