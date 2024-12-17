// Only used in use-chat-handler.tsx to keep it clean

import { AlertAction } from "@/context/alert-context"
import { createChatFiles } from "@/db/chat-files"
import { createChat } from "@/db/chats"
import { createMessageFileItems } from "@/db/message-file-items"
import {
  createMessages,
  deleteMessage,
  deleteMessagesIncludingAndAfter,
  updateMessage
} from "@/db/messages"
import { uploadMessageImage } from "@/db/storage/message-images"
import { Tables, TablesInsert } from "@/supabase/types"
import {
  ChatFile,
  ChatMessage,
  ChatPayload,
  ChatSettings,
  LLM,
  LLMID,
  MessageImage,
  DataPartValue
} from "@/types"
import { PluginID } from "@/types/plugins"
import React from "react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"
import { processDataStream } from "ai"
import { CONTINUE_PROMPT } from "@/lib/models/llm/llm-prompting"
import { buildFinalMessages } from "@/lib/build-prompt-v2"
import { supabase } from "@/lib/supabase/browser-client"
import { getTerminalPlugins } from "@/lib/tools/tool-store/tools-helper"
import { Fragment } from "@/lib/tools/e2b/fragments/types"

export const validateChatSettings = (
  chatSettings: ChatSettings | null,
  modelData: LLM | undefined,
  profile: Tables<"profiles"> | null,
  selectedWorkspace: Tables<"workspaces"> | null,
  isContinuation: boolean,
  messageContent: string | null
) => {
  if (!chatSettings) {
    throw new Error("Chat settings not found")
  }

  if (!modelData) {
    throw new Error("Model not found")
  }

  if (!profile) {
    throw new Error("Profile not found")
  }

  if (!selectedWorkspace) {
    throw new Error("Workspace not found")
  }

  if (!isContinuation && !messageContent) {
    throw new Error("Message content not found")
  }
}

export const fetchImageData = async (url: string) => {
  const { data, error } = await supabase.storage
    .from("message_images")
    .createSignedUrl(url, 60 * 60)

  if (error) {
    console.error(error)
    return null
  }

  return data?.signedUrl || null
}

export const bulkFetchImageData = async (urls: string[]) => {
  const { data, error } = await supabase.storage
    .from("message_images")
    .createSignedUrls(urls, 60 * 60)

  if (error) {
    console.error(error)
    throw new Error("Error fetching image data")
  }

  return data?.map(
    ({ signedUrl, error }: { signedUrl: string; error: any }) => {
      if (error) {
        console.error(error)
        return null
      }
      return signedUrl
    }
  )
}

export const handleRetrieval = async (
  userInput: string,
  newMessageFiles: ChatFile[],
  chatFiles: ChatFile[],
  embeddingsProvider: "openai" | "local",
  sourceCount: number
) => {
  const response = await fetch("/api/retrieval/retrieve", {
    method: "POST",
    body: JSON.stringify({
      userInput,
      fileIds: [...newMessageFiles, ...chatFiles].map(file => file.id),
      embeddingsProvider,
      sourceCount
    })
  })

  if (!response.ok) {
    console.error("Error retrieving:", response)
  }

  const { results } = (await response.json()) as {
    results: Tables<"file_items">[]
  }

  return results
}

export const createTempMessages = ({
  messageContent,
  chatMessages,
  chatSettings,
  b64Images,
  isContinuation,
  selectedPlugin,
  model
}: {
  messageContent: string | null
  chatMessages: ChatMessage[]
  chatSettings: ChatSettings
  b64Images: string[]
  isContinuation: boolean
  selectedPlugin: PluginID | null
  model: LLMID
}) => {
  const messageContentInternal = isContinuation
    ? CONTINUE_PROMPT
    : messageContent || CONTINUE_PROMPT

  let tempUserChatMessage: ChatMessage = {
    message: {
      chat_id: "",
      content: messageContentInternal,
      created_at: "",
      id: uuidv4(),
      image_paths: b64Images,
      model,
      plugin: selectedPlugin,
      role: "user",
      sequence_number: lastSequenceNumber(chatMessages) + 1,
      updated_at: "",
      user_id: "",
      rag_used: false,
      rag_id: null,
      citations: [],
      fragment: null
    },
    fileItems: []
  }

  let tempAssistantChatMessage: ChatMessage = {
    message: {
      chat_id: "",
      content: "",
      created_at: "",
      id: uuidv4(),
      image_paths: [],
      model,
      plugin: selectedPlugin,
      role: "assistant",
      sequence_number: lastSequenceNumber(chatMessages) + 2,
      updated_at: "",
      user_id: "",
      rag_used: false,
      rag_id: null,
      citations: [],
      fragment: null
    },
    fileItems: []
  }

  return {
    tempUserChatMessage,
    tempAssistantChatMessage
  }
}

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
  let { provider } = modelData
  let apiEndpoint = `/api/chat/${provider}`

  if (isTerminalContinuation || selectedPlugin === PluginID.TERMINAL) {
    apiEndpoint = `/api/chat/tools/terminal`
    setToolInUse(PluginID.TERMINAL)
    selectedPlugin = PluginID.TERMINAL
  } else if (selectedPlugin === PluginID.WEB_SEARCH) {
    apiEndpoint = "/api/chat/plugins/web-search"
    setToolInUse(PluginID.WEB_SEARCH)
  } else if (selectedPlugin === PluginID.FRAGMENTS) {
    apiEndpoint = "/api/chat/tools/fragments"
    setToolInUse(PluginID.FRAGMENTS)
    selectedPlugin = PluginID.FRAGMENTS
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
    selectedPlugin,
    isRagEnabled
  )
  const chatSettings = payload.chatSettings

  let requestBody: any

  if (isTerminalContinuation) {
    requestBody = {
      messages: formattedMessages,
      isTerminalContinuation: isTerminalContinuation
    }
  } else if (provider === "openai") {
    requestBody = {
      messages: formattedMessages,
      chatSettings
    }
  } else {
    requestBody = {
      messages: formattedMessages,
      chatSettings: chatSettings,
      isRetrieval:
        payload.messageFileItems && payload.messageFileItems.length > 0,
      isContinuation,
      isRagEnabled
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

  const requestBody: any = {
    payload: payload,
    chatImages: chatImages,
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

export const processResponse = async (
  response: Response,
  lastChatMessage: ChatMessage,
  controller: AbortController,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>,
  requestBody: object,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  alertDispatch: React.Dispatch<AlertAction>,
  selectedPlugin: PluginID,
  isContinuation: boolean,
  setFragment: (fragment: Fragment | null, chatMessage?: ChatMessage) => void
) => {
  if (!response.ok) {
    const result = await response.json()
    let errorMessage = result.error?.message || "An unknown error occurred"

    switch (response.status) {
      case 400:
        errorMessage = `Bad Request: ${errorMessage}`
        break
      case 401:
        errorMessage = `Invalid Credentials: ${errorMessage}`
        break
      case 402:
        errorMessage = `Out of Credits: ${errorMessage}`
        break
      case 403:
        errorMessage = `Moderation Required: ${errorMessage}`
        break
      case 408:
        errorMessage = `Request Timeout: ${errorMessage}`
        break
      case 429:
        errorMessage = `Rate Limited: ${errorMessage}`
        break
      case 502:
        errorMessage = `Service Unavailable: ${errorMessage}`
        break
      default:
        errorMessage = `HTTP Error: ${errorMessage}`
    }

    throw new Error(errorMessage)
  }

  if (response.body) {
    let fullText = ""
    let finishReason = ""
    let ragUsed = false
    let ragId = null
    let isFirstChunk = true
    let isFirstChunkReceived = false
    let updatedPlugin = selectedPlugin
    let assistantGeneratedImages: string[] = []
    let toolExecuted = false
    let citations: string[] = []
    let shouldSkipFirstChunk = false
    let fragment: Fragment = {} as Fragment

    try {
      await processDataStream({
        stream: response.body,
        onTextPart: value => {
          if (value && !controller.signal.aborted) {
            // Check if this is the first chunk and matches the last message
            if (isFirstChunk) {
              isFirstChunkReceived = true
              if (
                isContinuation &&
                lastChatMessage?.message?.content === value
              ) {
                shouldSkipFirstChunk = true
                isFirstChunk = false
                return
              }
              setFirstTokenReceived(true)
              isFirstChunk = false
            }

            // Skip if this was a duplicate first chunk
            if (shouldSkipFirstChunk) {
              shouldSkipFirstChunk = false
              return
            }

            fullText += value

            setChatMessages(prev =>
              prev.map(chatMessage =>
                chatMessage.message.id === lastChatMessage.message.id
                  ? {
                      ...chatMessage,
                      message: {
                        ...chatMessage.message,
                        content: chatMessage.message.content + value,
                        image_paths: chatMessage.message.image_paths
                      }
                    }
                  : chatMessage
              )
            )
          }
        },
        onDataPart: value => {
          if (
            Array.isArray(value) &&
            value.length > 0 &&
            !controller.signal.aborted
          ) {
            const firstValue = value[0] as DataPartValue

            // Handle text-delta type
            if (firstValue.type === "text-delta") {
              // Check if this is the first chunk and matches the last message
              if (isFirstChunk) {
                isFirstChunkReceived = true
                if (
                  isContinuation &&
                  lastChatMessage?.message?.content === firstValue.content
                ) {
                  shouldSkipFirstChunk = true
                  isFirstChunk = false
                  return
                }
                setFirstTokenReceived(true)
                isFirstChunk = false
              }

              // Skip if this was a duplicate first chunk
              if (shouldSkipFirstChunk) {
                shouldSkipFirstChunk = false
                return
              }

              fullText += firstValue.content

              setChatMessages(prev =>
                prev.map(chatMessage =>
                  chatMessage.message.id === lastChatMessage.message.id
                    ? {
                        ...chatMessage,
                        message: {
                          ...chatMessage.message,
                          content:
                            chatMessage.message.content + firstValue.content,
                          image_paths: chatMessage.message.image_paths
                        }
                      }
                    : chatMessage
                )
              )
            }

            // Fragment decoding
            if (firstValue.isFragment) {
              const fragmentData = value[1] as Fragment
              fragment = {
                ...fragment,
                ...fragmentData
              }

              if (fragment.shortAnswer && fragment.shortAnswer !== fullText) {
                setFirstTokenReceived(true)
                setToolInUse(PluginID.NONE)
                fullText = fragment.shortAnswer
                setChatMessages(prev =>
                  prev.map(chatMessage =>
                    chatMessage.message.id === lastChatMessage.message.id
                      ? {
                          ...chatMessage,
                          message: {
                            ...chatMessage.message,
                            content: fragment.shortAnswer,
                            image_paths: [],
                            fragment: fragment ? JSON.stringify(fragment) : null
                          }
                        }
                      : chatMessage
                  )
                )
              }
              setFragment(fragment, lastChatMessage)
            }

            // Handle citations
            if (firstValue?.citations) {
              citations = firstValue.citations
            }

            // Handle RAG data
            if (firstValue?.ragUsed !== undefined) {
              ragUsed = Boolean(firstValue.ragUsed)
              ragId =
                firstValue.ragId !== null ? String(firstValue.ragId) : null
            }
          }
        },
        onToolCallPart: async value => {
          if (toolExecuted || controller.signal.aborted) return

          const { toolName } = value

          if (toolName === "browser") {
            setToolInUse(PluginID.BROWSER)
            updatedPlugin = PluginID.BROWSER
          } else if (toolName === "terminal") {
            setToolInUse(PluginID.TERMINAL)
            updatedPlugin = PluginID.TERMINAL

            const terminalResponse = await fetchChatResponse(
              "/api/chat/tools/terminal",
              requestBody,
              controller,
              setIsGenerating,
              setChatMessages,
              alertDispatch
            )

            const terminalResult = await processResponse(
              terminalResponse,
              lastChatMessage,
              controller,
              setFirstTokenReceived,
              setChatMessages,
              setToolInUse,
              requestBody,
              setIsGenerating,
              alertDispatch,
              updatedPlugin,
              isContinuation,
              setFragment
            )

            fullText += terminalResult.fullText
            finishReason = terminalResult.finishReason
            citations = terminalResult.citations || citations
          } else if (toolName === "webSearch") {
            setToolInUse(PluginID.WEB_SEARCH)
            updatedPlugin = PluginID.WEB_SEARCH
          } else if (toolName === "fragments") {
            setToolInUse(PluginID.FRAGMENTS)
            updatedPlugin = PluginID.FRAGMENTS

            setFragment(null)

            const fragmentGeneratorResponse = await fetchChatResponse(
              "/api/chat/tools/fragments",
              requestBody,
              controller,
              setIsGenerating,
              setChatMessages,
              alertDispatch
            )

            const fragmentGeneratorResult = await processResponse(
              fragmentGeneratorResponse,
              lastChatMessage,
              controller,
              setFirstTokenReceived,
              setChatMessages,
              setToolInUse,
              requestBody,
              setIsGenerating,
              alertDispatch,
              updatedPlugin,
              isContinuation,
              setFragment
            )

            fullText += fragmentGeneratorResult.fullText
            finishReason = fragmentGeneratorResult.finishReason
            fragment = fragmentGeneratorResult.fragment
          }
          toolExecuted = true
        },
        onFinishMessagePart: value => {
          if (finishReason === "" && !controller.signal.aborted) {
            // Only set finishReason if it hasn't been set before
            if (
              value.finishReason === "tool-calls" &&
              getTerminalPlugins().includes(updatedPlugin)
            ) {
              // To use continue generating for terminal
              finishReason = "terminal-calls"
            } else if (
              value.finishReason === "length" &&
              !isFirstChunkReceived &&
              isContinuation
            ) {
              finishReason = "stop"
            } else {
              finishReason = value.finishReason
            }
          }
        }
      })
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Unexpected error processing stream:", error)
      }
    }

    return {
      fullText,
      finishReason,
      ragUsed,
      ragId,
      selectedPlugin: updatedPlugin,
      assistantGeneratedImages,
      citations,
      fragment
    }
  } else {
    throw new Error("Response body is null")
  }
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

export const lastSequenceNumber = (chatMessages: ChatMessage[]) =>
  chatMessages.reduce(
    (max, msg) => Math.max(max, msg.message.sequence_number),
    0
  )

export const handleCreateMessages = async (
  chatMessages: ChatMessage[],
  currentChat: Tables<"chats"> | null,
  profile: Tables<"profiles">,
  modelData: LLM,
  messageContent: string | null,
  generatedText: string,
  newMessageImages: MessageImage[],
  isRegeneration: boolean,
  isContinuation: boolean,
  retrievedFileItems: Tables<"file_items">[],
  setMessages: (messages: ChatMessage[]) => void,
  setChatImages: React.Dispatch<React.SetStateAction<MessageImage[]>>,
  selectedPlugin: PluginID,
  assistantGeneratedImages: string[],
  editSequenceNumber?: number,
  ragUsed?: boolean,
  ragId?: string | null,
  isTemporary: boolean = false,
  citations?: string[],
  fragment?: Fragment | null,
  setFragment?: (fragment: Fragment | null, chatMessage?: ChatMessage) => void
) => {
  const isEdit = editSequenceNumber !== undefined

  // If it's a temporary chat, don't create messages in the database
  if (isTemporary || !currentChat) {
    const tempUserMessage: ChatMessage = {
      message: {
        id: uuidv4(),
        chat_id: "",
        content: messageContent || "",
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sequence_number: lastSequenceNumber(chatMessages) + 1,
        user_id: profile.user_id,
        model: modelData.modelId,
        plugin: selectedPlugin,
        image_paths: newMessageImages.map(image => image.path),
        rag_used: ragUsed || false,
        rag_id: ragId || null,
        citations: [],
        fragment: null
      },
      fileItems: retrievedFileItems,
      isFinal: false
    }

    const tempAssistantMessage: ChatMessage = {
      message: {
        id: uuidv4(),
        chat_id: "",
        content: generatedText,
        role: "assistant",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sequence_number: lastSequenceNumber(chatMessages) + 2,
        user_id: profile.user_id,
        model: modelData.modelId,
        plugin: selectedPlugin,
        image_paths: assistantGeneratedImages || [],
        rag_used: ragUsed || false,
        rag_id: ragId || null,
        citations: citations || [],
        fragment: fragment ? JSON.stringify(fragment) : null
      },
      fileItems: [],
      isFinal: false
    }

    setMessages([...chatMessages, tempUserMessage, tempAssistantMessage])
    return
  }

  const finalUserMessage: TablesInsert<"messages"> = {
    chat_id: currentChat.id,
    user_id: profile.user_id,
    content: messageContent || "",
    model: modelData.modelId,
    plugin: selectedPlugin,
    role: "user",
    sequence_number: lastSequenceNumber(chatMessages) + 1,
    image_paths: [],
    rag_used: ragUsed || false,
    rag_id: ragId || null,
    citations: [],
    fragment: null
  }

  const finalAssistantMessage: TablesInsert<"messages"> = {
    chat_id: currentChat.id,
    user_id: profile.user_id,
    content: generatedText,
    model: modelData.modelId,
    plugin: selectedPlugin,
    role: "assistant",
    sequence_number: lastSequenceNumber(chatMessages) + 2,
    image_paths: assistantGeneratedImages || [],
    rag_used: ragUsed || false,
    rag_id: ragId || null,
    citations: citations || [],
    fragment: fragment ? JSON.stringify(fragment) : null
  }

  let finalChatMessages: ChatMessage[] = []

  // If the user is editing a message, delete all messages after the edited message
  if (isEdit) {
    await deleteMessagesIncludingAndAfter(
      profile.user_id,
      currentChat.id,
      editSequenceNumber
    )
  }

  if (isRegeneration) {
    const lastMessageId = chatMessages[chatMessages.length - 1].message.id
    await deleteMessage(lastMessageId)

    const createdMessages = await createMessages([finalAssistantMessage])

    const chatImagesWithUrls = await Promise.all(
      assistantGeneratedImages.map(async url => {
        const base64 = await fetchImageData(url)
        return {
          messageId: createdMessages[0].id,
          path: url,
          base64: base64,
          url: base64 || url,
          file: null
        }
      })
    )

    setChatImages(prevChatImages => [...prevChatImages, ...chatImagesWithUrls])

    finalChatMessages = [
      ...chatMessages.slice(0, -1),
      {
        message: createdMessages[0],
        fileItems: retrievedFileItems
      }
    ]

    setMessages(finalChatMessages)
  } else if (isContinuation) {
    const lastStartingMessage = chatMessages[chatMessages.length - 1].message

    const updatedMessage = await updateMessage(lastStartingMessage.id, {
      ...lastStartingMessage,
      content: lastStartingMessage.content + generatedText
    })

    chatMessages[chatMessages.length - 1].message = updatedMessage

    finalChatMessages = [...chatMessages]

    setMessages(finalChatMessages)
  } else {
    const createdMessages = await createMessages([
      finalUserMessage,
      {
        ...finalAssistantMessage,
        citations: citations || []
      }
    ])

    // Upload each image (stored in newMessageImages) for the user message to message_images bucket
    const uploadPromises = newMessageImages
      .filter(obj => obj.file !== null)
      .map(obj => {
        let filePath = `${profile.user_id}/${currentChat.id}/${
          createdMessages[0].id
        }/${uuidv4()}`

        return uploadMessageImage(filePath, obj.file as File).catch(error => {
          console.error(`Failed to upload image at ${filePath}:`, error)
          return null
        })
      })

    const paths = (await Promise.all(uploadPromises)).filter(
      Boolean
    ) as string[]

    const newImages = newMessageImages.map((obj, index) => ({
      ...obj,
      messageId: createdMessages[0].id,
      path: paths[index]
    }))

    const generatedImages = await Promise.all(
      assistantGeneratedImages.map(async url => {
        const base64Data = await fetchImageData(url)
        return {
          messageId: createdMessages[1].id,
          path: url,
          base64: base64Data,
          url: url,
          file: null
        }
      })
    )

    setChatImages(prevImages => [
      ...prevImages,
      ...newImages,
      ...generatedImages
    ])

    const updatedMessage = await updateMessage(createdMessages[0].id, {
      ...createdMessages[0],
      image_paths: paths
    })

    await createMessageFileItems(
      retrievedFileItems.map(fileItem => {
        return {
          user_id: profile.user_id,
          message_id: createdMessages[1].id,
          file_item_id: fileItem.id
        }
      })
    )

    finalChatMessages = [
      ...(isEdit
        ? chatMessages.filter(
            chatMessage =>
              chatMessage.message.sequence_number < editSequenceNumber
          )
        : chatMessages),
      {
        message: updatedMessage,
        fileItems: [],
        isFinal: true
      },
      {
        message: createdMessages[1],
        fileItems: retrievedFileItems,
        isFinal: true
      }
    ]

    setFragment?.(
      fragment ?? null,
      finalChatMessages[finalChatMessages.length - 1]
    )

    setMessages(finalChatMessages)
  }
}
