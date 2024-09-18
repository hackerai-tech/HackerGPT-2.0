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
import { consumeReadableStream } from "@/lib/consume-stream"
import { Tables, TablesInsert } from "@/supabase/types"
import {
  ChatFile,
  ChatMessage,
  ChatPayload,
  ChatSettings,
  LLM,
  LLMID,
  MessageImage
} from "@/types"
import { PluginID } from "@/types/plugins"
import React from "react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"
import { readDataStream } from "ai"
import { CONTINUE_PROMPT } from "@/lib/models/llm/llm-prompting"
import { buildFinalMessages } from "@/lib/build-prompt-v2"
import { supabase } from "@/lib/supabase/browser-client"

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

const fetchImageData = async (url: string) => {
  const { data, error } = await supabase.storage
    .from("message_images")
    .createSignedUrl(url, 60 * 60)

  if (error) {
    console.error(error)
    return null
  }

  return data?.signedUrl || null
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

export const createTempMessages = (
  messageContent: string | null,
  chatMessages: ChatMessage[],
  chatSettings: ChatSettings,
  b64Images: string[],
  isContinuation: boolean,
  selectedPlugin: PluginID | null,
  model: LLMID
) => {
  if (!messageContent || isContinuation) messageContent = CONTINUE_PROMPT

  let tempUserChatMessage: ChatMessage = {
    message: {
      chat_id: "",
      content: messageContent,
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
      rag_id: null
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
      rag_id: null
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
  newAbortController: AbortController,
  chatImages: MessageImage[],
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>,
  alertDispatch: React.Dispatch<AlertAction>,
  selectedPlugin: PluginID
) => {
  let { provider } = modelData
  let apiEndpoint = `/api/chat/${provider}`

  setToolInUse(
    isRagEnabled && provider !== "openai"
      ? "Enhanced Search"
      : selectedPlugin && selectedPlugin !== PluginID.NONE
        ? selectedPlugin
        : "none"
  )

  const formattedMessages = await buildFinalMessages(
    payload,
    profile,
    chatImages,
    selectedPlugin,
    isRagEnabled
  )
  const chatSettings = payload.chatSettings

  const requestBody =
    provider === "openai"
      ? {
          messages: formattedMessages,
          chatSettings
        }
      : {
          messages: formattedMessages,
          chatSettings: chatSettings,
          isRetrieval:
            payload.messageFileItems && payload.messageFileItems.length > 0,
          isContinuation,
          isRagEnabled
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
    selectedPlugin
  )
}

export const handleHostedPluginsChat = async (
  payload: ChatPayload,
  profile: Tables<"profiles">,
  modelData: LLM,
  tempAssistantChatMessage: ChatMessage,
  isRegeneration: boolean,
  newAbortController: AbortController,
  newMessageImages: MessageImage[],
  chatImages: MessageImage[],
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>,
  alertDispatch: React.Dispatch<AlertAction>,
  selectedPlugin: PluginID,
  fileData?: { fileName: string; fileContent: string }[]
) => {
  const apiEndpoint = "/api/chat/plugins"

  const requestBody: any = {
    payload: payload,
    chatImages: chatImages,
    selectedPlugin: selectedPlugin
  }

  if (fileData) {
    requestBody.fileData = fileData
  }

  if (selectedPlugin && selectedPlugin !== PluginID.NONE) {
    setToolInUse(selectedPlugin)
  }

  const response = await fetchChatResponse(
    apiEndpoint,
    requestBody,
    newAbortController,
    setIsGenerating,
    setChatMessages,
    alertDispatch
  )

  return await processResponsePlugins(
    response,
    isRegeneration
      ? payload.chatMessages[payload.chatMessages.length - 1]
      : tempAssistantChatMessage,
    newAbortController,
    setFirstTokenReceived,
    setChatMessages,
    setToolInUse
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
  selectedPlugin: PluginID
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
    let toolCallId = ""
    let ragUsed = false
    let ragId = null
    let isFirstChunk = true
    let updatedPlugin = selectedPlugin
    let assistantGeneratedImages: string[] = []
    const reader = response.body.getReader()
    const stream = readDataStream(reader, {
      isAborted: () => controller.signal.aborted
    })

    try {
      for await (const streamPart of stream) {
        // console.log(streamPart)

        const isReasonLLMResult = (
          part: any
        ): part is {
          type: "data"
          value: Array<{ reason: string }>
        } =>
          part.type === "data" &&
          Array.isArray(part.value) &&
          part.value.length > 0 &&
          typeof part.value[0] === "object" &&
          "reason" in part.value[0]

        const processStreamPart = (
          streamPart: any,
          toolCallId: string
        ): { contentToAdd: string; newImagePath: string | null } => {
          if (streamPart.type === "text")
            return { contentToAdd: streamPart.value, newImagePath: null }

          if (isReasonLLMResult(streamPart)) {
            return {
              contentToAdd: streamPart.value[0].reason,
              newImagePath: null
            }
          }

          return { contentToAdd: "", newImagePath: null }
        }

        function isReasonLLMObject(
          value: any
        ): value is { reasonLLM: boolean } {
          return (
            typeof value === "object" && value !== null && "reasonLLM" in value
          )
        }

        switch (streamPart.type) {
          case "text":
          case "tool_result":
          case "data":
            const { contentToAdd, newImagePath } = processStreamPart(
              streamPart,
              toolCallId
            )

            if (contentToAdd || newImagePath) {
              if (isFirstChunk) {
                setFirstTokenReceived(true)
                isFirstChunk = false
              }
              fullText += contentToAdd

              if (newImagePath) {
                assistantGeneratedImages.push(newImagePath)
              }

              setChatMessages(prev =>
                prev.map(chatMessage =>
                  chatMessage.message.id === lastChatMessage.message.id
                    ? {
                        ...chatMessage,
                        message: {
                          ...chatMessage.message,
                          content: chatMessage.message.content + contentToAdd,
                          image_paths: newImagePath
                            ? [...chatMessage.message.image_paths, newImagePath]
                            : chatMessage.message.image_paths
                        }
                      }
                    : chatMessage
                )
              )
            } else if (
              typeof streamPart.value === "object" &&
              streamPart.value !== null &&
              "ragUsed" in streamPart.value &&
              "ragId" in streamPart.value
            ) {
              ragUsed = Boolean(streamPart.value.ragUsed)
              ragId =
                streamPart.value.ragId !== null
                  ? String(streamPart.value.ragId)
                  : null
            } else if (
              streamPart.type === "data" &&
              Array.isArray(streamPart.value) &&
              streamPart.value.length > 0 &&
              isReasonLLMObject(streamPart.value[0])
            ) {
              setToolInUse(PluginID.REASON_LLM)
              updatedPlugin = PluginID.REASON_LLM
            }
            break

          case "tool_call":
            const { toolName } = streamPart.value

            if (toolName === "browser" && streamPart.value.args.open_url) {
              setToolInUse(PluginID.BROWSER)
              updatedPlugin = PluginID.BROWSER

              const urlToOpen = streamPart.value.args.open_url

              const browserRequestBody = {
                ...requestBody,
                open_url: urlToOpen
              }

              const browserResponse = await fetchChatResponse(
                "/api/chat/plugins/browser",
                browserRequestBody,
                controller,
                setIsGenerating,
                setChatMessages,
                alertDispatch
              )

              const browserResult = await processResponse(
                browserResponse,
                lastChatMessage,
                controller,
                setFirstTokenReceived,
                setChatMessages,
                setToolInUse,
                requestBody,
                setIsGenerating,
                alertDispatch,
                updatedPlugin
              )

              fullText += browserResult.fullText
            } else if (
              toolName === "terminal" &&
              streamPart.value.args.command
            ) {
              setToolInUse(PluginID.TERMINAL)
              updatedPlugin = PluginID.TERMINAL

              const command = streamPart.value.args.command

              const terminalRequestBody = {
                ...requestBody,
                command: command
              }

              const terminalResponse = await fetchChatResponse(
                "/api/chat/tools/terminal",
                terminalRequestBody,
                controller,
                setIsGenerating,
                setChatMessages,
                alertDispatch
              )

              const terminalResult = await processResponsePlugins(
                terminalResponse,
                lastChatMessage,
                controller,
                setFirstTokenReceived,
                setChatMessages,
                setToolInUse
              )

              fullText += terminalResult.fullText
            } else if (toolName === "webSearch") {
              setToolInUse(PluginID.WEB_SEARCH)
              updatedPlugin = PluginID.WEB_SEARCH

              const webSearchResponse = await fetchChatResponse(
                "/api/chat/plugins/web-search",
                requestBody,
                controller,
                setIsGenerating,
                setChatMessages,
                alertDispatch
              )

              const webSearchResult = await processResponse(
                webSearchResponse,
                lastChatMessage,
                controller,
                setFirstTokenReceived,
                setChatMessages,
                setToolInUse,
                requestBody,
                setIsGenerating,
                alertDispatch,
                updatedPlugin
              )

              fullText += webSearchResult.fullText
            }
            break

          case "finish_message":
            finishReason = streamPart.value.finishReason
            break
        }

        if (controller.signal.aborted) {
          break
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Unexpected error processing stream:", error)
      }
    } finally {
      reader.releaseLock()
      setToolInUse("none")
    }

    return {
      fullText,
      finishReason,
      ragUsed,
      ragId,
      selectedPlugin: updatedPlugin,
      assistantGeneratedImages
    }
  } else {
    throw new Error("Response body is null")
  }
}

export const processResponsePlugins = async (
  response: Response,
  lastChatMessage: ChatMessage,
  controller: AbortController,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>
) => {
  let fullText = ""
  let isFirstChunk = true

  if (response.body) {
    try {
      await consumeReadableStream(
        response.body,
        chunk => {
          if (isFirstChunk) {
            setFirstTokenReceived(true)
            isFirstChunk = false
          }

          fullText += chunk
          setChatMessages(prev =>
            prev.map(chatMessage =>
              chatMessage.message.id === lastChatMessage.message.id
                ? {
                    message: {
                      ...chatMessage.message,
                      content: chatMessage.message.content + chunk
                    },
                    fileItems: chatMessage.fileItems
                  }
                : chatMessage
            )
          )
        },
        controller.signal
      )
    } finally {
      setToolInUse("none")
    }

    return { fullText, finishReason: "" }
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
  currentChat: Tables<"chats">,
  profile: Tables<"profiles">,
  modelData: LLM,
  messageContent: string | null,
  generatedText: string,
  newMessageImages: MessageImage[],
  isRegeneration: boolean,
  isContinuation: boolean,
  retrievedFileItems: Tables<"file_items">[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setChatImages: React.Dispatch<React.SetStateAction<MessageImage[]>>,
  selectedPlugin: PluginID | null,
  editSequenceNumber: number | undefined,
  ragUsed: boolean,
  ragId: string | null,
  assistantGeneratedImages: string[]
) => {
  const isEdit = editSequenceNumber !== undefined

  const finalUserMessage: TablesInsert<"messages"> = {
    chat_id: currentChat.id,
    user_id: profile.user_id,
    content: messageContent || "",
    model: modelData.modelId,
    plugin: selectedPlugin,
    role: "user",
    sequence_number: lastSequenceNumber(chatMessages) + 1,
    image_paths: [],
    rag_used: ragUsed,
    rag_id: ragId
  }

  const finalAssistantMessage: TablesInsert<"messages"> = {
    chat_id: currentChat.id,
    user_id: profile.user_id,
    content: generatedText,
    model: modelData.modelId,
    plugin: selectedPlugin,
    role: "assistant",
    sequence_number: lastSequenceNumber(chatMessages) + 2,
    image_paths: assistantGeneratedImages,
    rag_used: ragUsed,
    rag_id: ragId
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

    setChatMessages(finalChatMessages)
  } else if (isContinuation) {
    const lastStartingMessage = chatMessages[chatMessages.length - 1].message

    const updatedMessage = await updateMessage(lastStartingMessage.id, {
      ...lastStartingMessage,
      content: lastStartingMessage.content + generatedText
    })

    chatMessages[chatMessages.length - 1].message = updatedMessage

    finalChatMessages = [...chatMessages]

    setChatMessages(finalChatMessages)
  } else {
    const createdMessages = await createMessages([
      finalUserMessage,
      finalAssistantMessage
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
        fileItems: []
      },
      {
        message: createdMessages[1],
        fileItems: retrievedFileItems
      }
    ]

    setChatMessages(finalChatMessages)
  }
}
