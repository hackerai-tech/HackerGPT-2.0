import { ChatMessage, MessageImage, PluginID, LLM, ChatFile } from "@/types"
import { Tables, TablesInsert } from "@/supabase/types"
import { Fragment } from "@/lib/tools/e2b/fragments/types"
import { v4 as uuidv4 } from "uuid"
import { lastSequenceNumber } from "@/lib/utils"
import {
  deleteMessagesIncludingAndAfter,
  updateMessage,
  deleteMessage,
  createMessages
} from "@/db/messages"
import { fetchImageData } from "./image-handlers"
import { uploadMessageImage } from "@/db/storage/message-images"
import { createMessageFileItems } from "@/db/message-file-items"
import { toast } from "sonner"

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
  setFragment?: (fragment: Fragment | null, chatMessage?: ChatMessage) => void,
  thinkingText?: string,
  thinkingElapsedSecs?: number | null,
  newChatFiles?: ChatFile[]
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
        thinking_content: null,
        thinking_enabled: selectedPlugin === PluginID.REASONING,
        thinking_elapsed_secs: null,
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
        thinking_content: thinkingText || null,
        thinking_enabled: selectedPlugin === PluginID.REASONING,
        thinking_elapsed_secs: thinkingElapsedSecs || null,
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
    thinking_content: null,
    thinking_enabled: selectedPlugin === PluginID.REASONING,
    thinking_elapsed_secs: null,
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
    thinking_content: thinkingText || null,
    thinking_enabled: selectedPlugin === PluginID.REASONING,
    thinking_elapsed_secs: thinkingElapsedSecs || null,
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
    const { error } = await deleteMessagesIncludingAndAfter(
      profile.user_id,
      currentChat.id,
      editSequenceNumber
    )

    if (error) {
      toast.error("Error deleting messages:", {
        description: error
      })
    }
  }

  if (isRegeneration) {
    const lastMessageId = chatMessages[chatMessages.length - 1].message.id
    await deleteMessage(lastMessageId)

    const createdMessages = await createMessages([finalAssistantMessage], [])

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
      content: lastStartingMessage.content + generatedText
    })

    chatMessages[chatMessages.length - 1].message = updatedMessage

    finalChatMessages = [...chatMessages]

    setMessages(finalChatMessages)
  } else {
    const createdMessages = await createMessages(
      [finalUserMessage, finalAssistantMessage],
      newChatFiles || []
    )

    // Upload each image (stored in newMessageImages) for the user message to message_images bucket
    const uploadPromises = newMessageImages
      .filter(obj => obj.file !== null)
      .map(obj => {
        const filePath = `${profile.user_id}/${currentChat.id}/${
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

    let messageWithPaths = createdMessages[0]
    if (paths.length > 0) {
      messageWithPaths = await updateMessage(createdMessages[0].id, {
        image_paths: paths
      })
    }

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
              chatMessage.message.sequence_number <= editSequenceNumber
          )
        : chatMessages),
      {
        message: messageWithPaths,
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
