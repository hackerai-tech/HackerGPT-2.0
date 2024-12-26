import { CONTINUE_PROMPT } from "@/lib/models/llm/llm-prompting"
import { lastSequenceNumber } from "@/lib/utils"
import { ChatMessage, ChatSettings, LLMID, PluginID } from "@/types"
import { v4 as uuidv4 } from "uuid"

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