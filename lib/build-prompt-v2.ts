import { Tables } from "@/supabase/types"
import {
  BuiltChatMessage,
  ChatMessage,
  ChatPayload,
  MessageImage
} from "@/types"
import { PluginID } from "@/types/plugins"
import { countTokens } from "gpt-tokenizer"
import { GPT4o } from "./models/llm/openai-llm-list"
import { PGPT4 } from "./models/llm/hackerai-llm-list"
import endent from "endent"
import { toast } from "sonner"
import { getTerminalPlugins } from "./tools/tool-store/tools-helper"
import { Fragment } from "./tools/e2b/fragments/types"

export async function buildFinalMessages(
  payload: ChatPayload,
  chatImages: MessageImage[],
  selectedPlugin: PluginID | null,
  shouldUseRAG?: boolean
): Promise<BuiltChatMessage[]> {
  const { chatSettings, chatMessages, messageFileItems } = payload

  let CHUNK_SIZE = 8000
  if (chatSettings.model === GPT4o.modelId) {
    CHUNK_SIZE = 32000 - 4000 // -4000 for the system prompt, custom instructions, and more
  } else if (chatSettings.model === PGPT4.modelId) {
    CHUNK_SIZE = 16000 - 4000 // -4000 for the system prompt, custom instructions, and more
  }

  // Lower chunk size for terminal plugins
  if (selectedPlugin && getTerminalPlugins().includes(selectedPlugin)) {
    CHUNK_SIZE = 8000
  }

  // Adjusting the chunk size for RAG
  if (shouldUseRAG) {
    CHUNK_SIZE = 6000
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
      Each <doc>...</doc> section represents part of the overall file. 
      Assess each section for information pertinent to the query.
      
      \n\n${retrievalText}\n\n

        Draw insights directly from file content to provide specific guidance. 
        Ensure answers are actionable, focusing on practical relevance. 
        Highlight or address any ambiguities found in the content. 
        State clearly if information related to the query is not available.`
    }
  }

  return finalMessages
}

function buildRetrievalText(fileItems: Tables<"file_items">[]) {
  const retrievalText = fileItems
    .map(item => `<doc>\n${item.content}\n</doc>`)
    .join("\n\n")

  return `${retrievalText}`
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
