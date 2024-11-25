import { useAlertContext } from "@/context/alert-context"
import { PentestGPTContext } from "@/context/context"
import { updateChat } from "@/db/chats"
import { Tables, TablesInsert } from "@/supabase/types"
import { ChatMessage, ChatPayload, LLMID } from "@/types"
import { PluginID } from "@/types/plugins"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useRef } from "react"
import { LLM_LIST } from "../../../lib/models/llm/llm-list"

import { createMessageFeedback } from "@/db/message-feedback"
import {
  createTempMessages,
  handleCreateChat,
  handleCreateMessages,
  handleHostedChat,
  handleHostedPluginsChat,
  handleRetrieval,
  validateChatSettings
} from "../chat-helpers"

export const useChatHandler = () => {
  const router = useRouter()
  const { dispatch: alertDispatch } = useAlertContext()

  const {
    userInput,
    chatFiles,
    setUserInput,
    setNewMessageImages,
    profile,
    setIsGenerating,
    setChatMessages,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    abortController,
    setAbortController,
    chatSettings,
    newMessageImages,
    chatMessages,
    chatImages,
    setChatImages,
    setChatFiles,
    setNewMessageFiles,
    setShowFilesDisplay,
    newMessageFiles,
    setToolInUse,
    useRetrieval,
    sourceCount,
    setIsAtPickerOpen,
    setChatSettings,
    isAtPickerOpen,
    isGenerating,
    setUseRetrieval,
    setIsReadyToChat,
    isTemporaryChat,
    temporaryChatMessages,
    setTemporaryChatMessages
  } = useContext(PentestGPTContext)

  let { selectedPlugin } = useContext(PentestGPTContext)

  const isGeneratingRef = useRef(isGenerating)

  useEffect(() => {
    isGeneratingRef.current = isGenerating
  }, [isGenerating])

  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isAtPickerOpen) {
      chatInputRef.current?.focus()
    }
  }, [isAtPickerOpen])

  // Initialize chat settings on component mount
  useEffect(() => {
    if (selectedChat && selectedChat.model) {
      setChatSettings(prevSettings => ({
        ...prevSettings,
        model: selectedChat.model as LLMID
      }))
    }
  }, [selectedChat, setChatSettings])

  const handleSelectChat = async (chat: Tables<"chats">) => {
    if (!selectedWorkspace) return
    await handleStopMessage()
    setIsReadyToChat(false)

    if (chat.model) {
      setChatSettings(prevSettings => ({
        ...prevSettings,
        model: chat.model as LLMID
      }))
    }

    return router.push(`/${selectedWorkspace.id}/chat/${chat.id}`)
  }

  const handleNewChat = async () => {
    if (!selectedWorkspace) return

    await handleStopMessage()

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
    setIsAtPickerOpen(false)
    setUseRetrieval(false)

    setToolInUse("none")

    setIsReadyToChat(true)
    return router.push(`/${selectedWorkspace.id}/chat`)
  }

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus()
  }

  const handleStopMessage = async () => {
    if (abortController && !abortController.signal.aborted) {
      abortController.abort()
      while (isGeneratingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  const handleSendFeedback = async (
    chatMessage: ChatMessage,
    feedback: "good" | "bad",
    reason?: string,
    detailedFeed?: string,
    allow_email?: boolean,
    allow_sharing?: boolean
  ) => {
    const feedbackInsert: TablesInsert<"feedback"> = {
      message_id: chatMessage.message.id,
      user_id: chatMessage.message.user_id,
      chat_id: chatMessage.message.chat_id,
      feedback: feedback,
      reason: reason ?? chatMessage.feedback?.reason,
      detailed_feedback:
        detailedFeed ?? chatMessage.feedback?.detailed_feedback,
      model: chatMessage.message.model,
      created_at: chatMessage.feedback?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sequence_number: chatMessage.message.sequence_number,
      allow_email: allow_email,
      allow_sharing: allow_sharing,
      has_files: chatMessage.fileItems.length > 0,
      plugin: chatMessage.message.plugin || PluginID.NONE,
      rag_used: chatMessage.message.rag_used,
      rag_id: chatMessage.message.rag_id
    }
    const newFeedback = await createMessageFeedback(feedbackInsert)
    setChatMessages((prevMessages: ChatMessage[]) =>
      prevMessages.map((message: ChatMessage) =>
        message.message.id === chatMessage.message.id
          ? { ...message, feedback: newFeedback[0] }
          : message
      )
    )
  }

  const handleSendContinuation = async () => {
    await handleSendMessage(null, chatMessages, false, true)
  }

  const handleSendTerminalContinuation = async () => {
    await handleSendMessage(
      null,
      chatMessages,
      false,
      true,
      undefined,
      undefined,
      true
    )
  }

  const handleSendMessage = async (
    messageContent: string | null,
    chatMessages: ChatMessage[],
    isRegeneration: boolean,
    isContinuation: boolean = false,
    editSequenceNumber?: number,
    model?: LLMID,
    isTerminalContinuation: boolean = false
  ) => {
    const isEdit = editSequenceNumber !== undefined
    const isRagEnabled = selectedPlugin === PluginID.ENHANCED_SEARCH

    try {
      if (!isRegeneration) {
        setUserInput("")
      }

      if (isContinuation) {
        setFirstTokenReceived(true)
      }
      setIsGenerating(true)
      setIsAtPickerOpen(false)
      setNewMessageImages([])

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      const modelData = [...LLM_LIST].find(
        llm => llm.modelId === (model || chatSettings?.model)
      )

      validateChatSettings(
        chatSettings,
        modelData,
        profile,
        selectedWorkspace,
        isContinuation,
        messageContent
      )

      if (chatSettings && !isRegeneration) {
        chatSettings.model = model || chatSettings.model
      }

      let currentChat = selectedChat ? { ...selectedChat } : null

      const b64Images = newMessageImages.map(image => image.base64)

      const { tempUserChatMessage, tempAssistantChatMessage } =
        createTempMessages({
          messageContent,
          chatMessages,
          chatSettings: chatSettings!,
          b64Images,
          isContinuation,
          selectedPlugin,
          model: model || chatSettings!.model
        })

      let sentChatMessages = isTemporaryChat
        ? [...temporaryChatMessages]
        : [...chatMessages]

      // If the message is an edit, remove all following messages
      if (isEdit) {
        sentChatMessages = sentChatMessages.filter(
          chatMessage =>
            chatMessage.message.sequence_number < editSequenceNumber
        )
      }

      if (isRegeneration) {
        sentChatMessages.pop()
        sentChatMessages.push(tempAssistantChatMessage)
      } else {
        sentChatMessages.push(tempUserChatMessage)
        if (!isContinuation) sentChatMessages.push(tempAssistantChatMessage)
      }

      // Update the UI with the new messages except for continuations
      if (!isContinuation) {
        if (isTemporaryChat) {
          setTemporaryChatMessages(sentChatMessages)
        } else {
          setChatMessages(sentChatMessages)
        }
      }

      let retrievedFileItems: Tables<"file_items">[] = []

      if (
        (newMessageFiles.length > 0 || chatFiles.length > 0) &&
        useRetrieval &&
        !isContinuation
      ) {
        setToolInUse("retrieval")

        retrievedFileItems = await handleRetrieval(
          userInput,
          newMessageFiles,
          chatFiles,
          chatSettings!.embeddingsProvider,
          sourceCount
        )
      }

      let payload: ChatPayload = {
        chatSettings: {
          ...chatSettings!,
          model: model || chatSettings!.model
        },
        chatMessages: sentChatMessages,
        messageFileItems: retrievedFileItems
      }

      let generatedText = ""
      let finishReasonFromResponse = ""
      let ragUsed = false
      let ragId = null
      let assistantGeneratedImages: string[] = []
      let citations: string[] = []

      if (
        selectedPlugin.length > 0 &&
        selectedPlugin !== PluginID.NONE &&
        selectedPlugin !== PluginID.WEB_SEARCH &&
        selectedPlugin !== PluginID.ENHANCED_SEARCH &&
        selectedPlugin !== PluginID.TERMINAL
      ) {
        const {
          fullText,
          finishReason,
          citations: citationsFromResponse
        } = await handleHostedPluginsChat(
          payload,
          profile!,
          modelData!,
          tempAssistantChatMessage,
          isRegeneration,
          isTerminalContinuation,
          newAbortController,
          newMessageImages,
          chatImages,
          setIsGenerating,
          setFirstTokenReceived,
          isTemporaryChat ? setTemporaryChatMessages : setChatMessages,
          setToolInUse,
          alertDispatch,
          selectedPlugin
        )
        generatedText = fullText
        finishReasonFromResponse = finishReason
        citations = citationsFromResponse
      } else {
        const {
          fullText,
          finishReason,
          ragUsed: ragUsedFromResponse,
          ragId: ragIdFromResponse,
          selectedPlugin: updatedSelectedPlugin,
          assistantGeneratedImages: assistantGeneratedImagesFromResponse,
          citations: citationsFromResponse
        } = await handleHostedChat(
          payload,
          profile!,
          modelData!,
          tempAssistantChatMessage,
          isRegeneration,
          isRagEnabled,
          isContinuation,
          isTerminalContinuation,
          newAbortController,
          chatImages,
          setIsGenerating,
          setFirstTokenReceived,
          isTemporaryChat ? setTemporaryChatMessages : setChatMessages,
          setToolInUse,
          alertDispatch,
          selectedPlugin
        )
        generatedText = fullText
        finishReasonFromResponse = finishReason
        ragUsed = ragUsedFromResponse
        ragId = ragIdFromResponse
        selectedPlugin = updatedSelectedPlugin
        assistantGeneratedImages = assistantGeneratedImagesFromResponse
        citations = citationsFromResponse
      }

      if (isTemporaryChat) {
        // Update temporary chat messages with the generated response
        const updatedMessages = sentChatMessages.map(msg =>
          msg.message.id === tempAssistantChatMessage.message.id
            ? {
                ...msg,
                message: {
                  ...msg.message,
                  content: generatedText,
                  citations: citations || []
                }
              }
            : msg
        )
        setTemporaryChatMessages(updatedMessages)
      } else {
        if (!currentChat) {
          currentChat = await handleCreateChat(
            chatSettings!,
            profile!,
            selectedWorkspace!,
            messageContent || "",
            newMessageFiles,
            finishReasonFromResponse,
            setSelectedChat,
            setChats,
            setChatFiles
          )
        } else {
          const updatedChat = await updateChat(currentChat.id, {
            updated_at: new Date().toISOString(),
            finish_reason: finishReasonFromResponse,
            model: chatSettings?.model
          })

          setChats(prevChats => {
            const updatedChats = prevChats.map(prevChat =>
              prevChat.id === updatedChat.id ? updatedChat : prevChat
            )

            return updatedChats
          })

          if (selectedChat?.id === updatedChat.id) {
            setSelectedChat(updatedChat)
          }
        }

        await handleCreateMessages(
          chatMessages,
          currentChat,
          profile!,
          modelData!,
          messageContent,
          generatedText,
          newMessageImages,
          isRegeneration,
          isContinuation,
          retrievedFileItems,
          setChatMessages,
          setChatImages,
          selectedPlugin,
          assistantGeneratedImages,
          editSequenceNumber,
          ragUsed,
          ragId,
          isTemporaryChat,
          citations
        )
      }

      setToolInUse("none")
      setIsGenerating(false)
      setFirstTokenReceived(false)
    } catch (error) {
      setToolInUse("none")
      setIsGenerating(false)
      setFirstTokenReceived(false)
    }
  }

  const handleSendEdit = async (
    editedContent: string,
    sequenceNumber: number
  ) => {
    if (!selectedChat) return

    handleSendMessage(editedContent, chatMessages, false, false, sequenceNumber)
  }

  return {
    chatInputRef,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendContinuation,
    handleSendTerminalContinuation,
    handleSendEdit,
    handleSendFeedback,
    handleSelectChat
  }
}
