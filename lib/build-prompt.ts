import {
  BuiltChatMessage,
  ChatMessage,
  ChatPayload,
  MessageImage
} from "@/types"
import {
  CoreAssistantMessage,
  CoreMessage,
  CoreSystemMessage,
  CoreUserMessage
} from "ai"
import { Tables } from "@/supabase/types"
import { countTokens } from "gpt-tokenizer"
import { GPT4o } from "./models/llm/openai-llm-list"
import { PGPT3_5, PGPT4 } from "./models/llm/hackerai-llm-list"
import endent from "endent"
import { toast } from "sonner"
import { Fragment } from "./tools/e2b/fragments/types"

export async function buildFinalMessages(
  payload: ChatPayload,
  chatImages: MessageImage[],
  shouldUseRAG?: boolean
): Promise<BuiltChatMessage[]> {
  const { chatSettings, chatMessages, messageFileItems } = payload

  let CHUNK_SIZE = 12000
  if (chatSettings.model === GPT4o.modelId) {
    CHUNK_SIZE = 32000 - 4000 // -4000 for the system prompt, custom instructions, and more
  } else if (chatSettings.model === PGPT4.modelId) {
    CHUNK_SIZE = 32000 - 4000 // -4000 for the system prompt, custom instructions, and more
  } else if (chatSettings.model === PGPT3_5.modelId) {
    CHUNK_SIZE = 12000 - 4000 // -4000 for the system prompt, custom instructions, and more
  }

  // Adjusting the chunk size for RAG
  if (shouldUseRAG) {
    CHUNK_SIZE = 12000
  }

  let remainingTokens = CHUNK_SIZE

  const lastUserMessage = chatMessages[chatMessages.length - 2].message.content
  const lastUserMessageContent = Array.isArray(lastUserMessage)
    ? lastUserMessage
        .map(item => (item.type === "text" ? item.text : ""))
        .join(" ")
    : lastUserMessage
  const lastUserMessageTokens = countTokens(lastUserMessageContent)

  if (lastUserMessageTokens > CHUNK_SIZE) {
    const errorMessage =
      "The message you submitted was too long, please submit something shorter."
    toast.error(errorMessage)
    throw new Error(errorMessage)
  }

  const processedChatMessages = chatMessages.map((chatMessage, index) => {
    const nextChatMessage = chatMessages[index + 1]

    if (nextChatMessage === undefined) {
      return chatMessage
    }

    const returnMessage: ChatMessage = {
      ...chatMessage
    }

    if (chatMessage.fileItems.length > 0) {
      const retrievalText = buildRetrievalText(chatMessage.fileItems)

      returnMessage.message = {
        ...returnMessage.message,
        content:
          `User Query: "${chatMessage.message.content}"\n\nFile Content:\n${retrievalText}` as string
      }
      returnMessage.fileItems = []
    }

    if (
      chatMessage.message.fragment &&
      typeof chatMessage.message.fragment === "string"
    ) {
      const fragment: Fragment = JSON.parse(chatMessage.message.fragment)

      returnMessage.message = {
        ...returnMessage.message,
        content: `Fragment: "${fragment.code}"` as string
      }
    }

    return returnMessage
  })

  const truncatedMessages: any[] = []

  for (let i = processedChatMessages.length - 1; i >= 0; i--) {
    const messageSizeLimit = Number(process.env.MESSAGE_SIZE_LIMIT || 12000)
    if (
      processedChatMessages[i].message.role === "assistant" &&
      processedChatMessages[i].message.content.length > messageSizeLimit
    ) {
      const messageSizeKeep = Number(process.env.MESSAGE_SIZE_KEEP || 2000)
      processedChatMessages[i].message = {
        ...processedChatMessages[i].message,
        content:
          processedChatMessages[i].message.content.slice(0, messageSizeKeep) +
          "\n... [output truncated]"
      }
    }
    const message = processedChatMessages[i].message

    const messageTokens = countTokens(message.content)

    if (messageTokens <= remainingTokens) {
      remainingTokens -= messageTokens
      truncatedMessages.unshift(message)
    } else {
      break
    }
  }

  const finalMessages: BuiltChatMessage[] = truncatedMessages.map(message => {
    let content

    if (message.image_paths.length > 0 && message.role !== "assistant") {
      content = [
        {
          type: "text",
          text: message.content
        },
        ...message.image_paths.map((path: string) => {
          let formedUrl = ""

          if (path.startsWith("data")) {
            formedUrl = path
          } else {
            const chatImage = chatImages.find(image => image.path === path)

            if (chatImage) {
              formedUrl = chatImage.base64
            }
          }

          return {
            type: "image_url",
            image_url: {
              url: formedUrl
            }
          }
        })
      ]
    } else {
      content = message.content
    }

    return {
      role: message.role,
      content
    }
  })

  if (messageFileItems.length > 0) {
    const retrievalText = buildRetrievalText(messageFileItems)

    finalMessages[finalMessages.length - 2] = {
      ...finalMessages[finalMessages.length - 2],
      content: endent`Assist with the user's query: '${finalMessages[finalMessages.length - 2].content}' using uploaded files. 
      Each <doc> tag contains a section of a file. The id attribute is for internal reference only - do not expose these IDs to users.
      When discussing files, use only their names (shown in the name attribute) to reference them.
      
      \n\n${retrievalText}\n\n

      Guidelines for your response:
      - If uncertain, ask the user for clarification.
      - If the context is unreadable or of poor quality, inform the user and provide the best possible answer.
      - If the answer isn't present in the context but you possess the knowledge, explain this to the user and provide the answer using your own understanding.
      - Draw insights directly from file content to provide specific guidance
      - Always reference files by their names, never by their IDs
      - Ensure answers are actionable, focusing on practical relevance
      - Highlight or address any ambiguities found in the content
      - When referencing file content, use the filename for clarity (e.g., "In config.json, I found...")
      - State clearly if information related to the query is not available`
    }
  }

  return finalMessages
}

function buildRetrievalText(fileItems: Tables<"file_items">[]) {
  const retrievalText = fileItems
    .map(item => {
      // Add file metadata to the doc tag
      const docHeader = `<doc id="${item.file_id}" ${
        item.name ? `name="${item.name}"` : ""
      }>`
      return `${docHeader}\n${item.content}\n</doc>`
    })
    .join("\n\n")

  return `${retrievalText}`
}

export function filterEmptyAssistantMessages(messages: any[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant" && messages[i].content.trim() === "") {
      messages.splice(i, 1)
      break
    }
  }
}

export const toVercelChatMessages = (
  messages: BuiltChatMessage[],
  supportsImages: boolean = false
): CoreMessage[] => {
  return messages
    .map(message => {
      switch (message.role) {
        case "assistant":
          return {
            role: "assistant",
            content: Array.isArray(message.content)
              ? message.content.map(content => {
                  if (typeof content === "object" && content.type === "text") {
                    return {
                      type: "text",
                      text: content.text
                    }
                  } else {
                    return {
                      type: "text",
                      text: content
                    }
                  }
                })
              : [{ type: "text", text: message.content as string }]
          } as CoreAssistantMessage
        case "user":
          return {
            role: message.role,
            content: Array.isArray(message.content)
              ? message.content
                  .map(content => {
                    if (
                      typeof content === "object" &&
                      content.type === "image_url"
                    ) {
                      if (supportsImages) {
                        return {
                          type: "image",
                          image: new URL(content.image_url.url)
                        }
                      } else {
                        return null
                      }
                    } else if (
                      typeof content === "object" &&
                      content.type === "text"
                    ) {
                      return {
                        type: "text",
                        text: content.text
                      }
                    } else {
                      return {
                        type: "text",
                        text: content
                      }
                    }
                  })
                  .filter(Boolean)
              : [{ type: "text", text: message.content as string }]
          } as CoreUserMessage
        case "system":
          return {
            role: "system",
            content: message.content
          } as CoreSystemMessage
        default:
          return null
      }
    })
    .filter(message => message !== null)
}

export function handleAssistantMessages(
  messages: any[],
  onlyLast: boolean = false
) {
  let foundAssistant = false
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      foundAssistant = true
      if (messages[i].content.trim() === "") {
        messages[i].content = "Sure, "
      }
      if (onlyLast) break
    }
  }

  if (!foundAssistant) {
    messages.push({ role: "assistant", content: "Sure, " })
  }
}

/**
 * Checks if any messages in the conversation include images.
 * This function is used to determine if image processing capabilities are needed
 * for the current context of the conversation.
 *
 * @param messages - The array of all messages in the conversation
 * @returns boolean - True if any messages contain an image, false otherwise
 */
export function messagesIncludeImages(messages: BuiltChatMessage[]): boolean {
  const recentMessages = messages.slice(-6)

  return recentMessages.some(
    message =>
      Array.isArray(message.content) &&
      message.content.some(
        item =>
          typeof item === "object" &&
          "type" in item &&
          item.type === "image_url"
      )
  )
}

/**
 * Filters out empty assistant messages and their preceding user messages.
 * Specifically handles Mistral API's edge case of empty responses.
 * Used in both chat and question generation flows.
 *
 * @param messages - Array of chat messages
 * @returns Filtered array with valid messages only
 */
export function validateMessages(messages: any[]) {
  const validMessages = []

  for (let i = 0; i < messages.length; i++) {
    const currentMessage = messages[i]
    const nextMessage = messages[i + 1]

    // Skip empty assistant responses (Mistral-specific)
    const isInvalidExchange =
      currentMessage.role === "user" &&
      nextMessage?.role === "assistant" &&
      !nextMessage.content

    if (isInvalidExchange) {
      i++ // Skip next message
      continue
    }

    // Keep valid messages
    if (currentMessage.role !== "assistant" || currentMessage.content) {
      validMessages.push(currentMessage)
    }
  }

  return validMessages
}

/**
 * Removes the last assistant message if it only contains "Sure, "
 * @param messages - Array of chat messages
 * @returns Filtered array without the "Sure, " message
 */
export function removeLastSureMessage(messages: any[]) {
  if (messages.length === 0) return messages

  const lastMessage = messages[messages.length - 1]
  if (
    lastMessage.role === "assistant" &&
    lastMessage.content.trim().toLowerCase() === "sure,"
  ) {
    return messages.slice(0, -1)
  }

  return messages
}
