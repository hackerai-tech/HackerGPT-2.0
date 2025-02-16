import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"
import { ChatFile } from "@/types"

export const getMessageById = async (messageId: string) => {
  const { data: message } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single()

  if (!message) {
    throw new Error("Message not found")
  }

  return message
}

export const getMessagesByChatId = async (
  chatId: string,
  limit = 20,
  lastSequenceNumber?: number
) => {
  let query = supabase
    .from("messages")
    .select("*, feedback(*), file_items (*)")
    .eq("chat_id", chatId)
    .order("sequence_number", { ascending: false })
    .limit(limit)

  if (lastSequenceNumber !== undefined) {
    query = query.lt("sequence_number", lastSequenceNumber)
  }

  const { data: messages } = await query

  if (!messages) {
    throw new Error("Messages not found")
  }

  return messages.reverse()
}

export const createMessage = async (message: TablesInsert<"messages">) => {
  const { data: createdMessage, error } = await supabase
    .from("messages")
    .insert([message])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdMessage
}

export const createMessages = async (
  messages: TablesInsert<"messages">[],
  newChatFiles: ChatFile[]
) => {
  const { data: createdMessages, error } = await supabase
    .from("messages")
    .insert(messages)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  const fileIds = newChatFiles
    .map(file => file.id)
    .filter(id => id !== undefined)

  if (fileIds.length > 0) {
    const { error: filesError } = await supabase
      .from("files")
      .update({ message_id: createdMessages[0].id })
      .in("id", fileIds)
      .is("message_id", null)
      .select("*")

    if (filesError) {
      throw new Error(filesError.message)
    }
  }

  return createdMessages
}

export const updateMessage = async (
  messageId: string,
  message: TablesUpdate<"messages">
) => {
  const { data: updatedMessage, error } = await supabase
    .from("messages")
    .update(message)
    .eq("id", messageId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedMessage
}

export const deleteMessage = async (messageId: string) => {
  const { error } = await supabase.from("messages").delete().eq("id", messageId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export async function deleteMessagesIncludingAndAfter(
  userId: string,
  chatId: string,
  sequenceNumber: number
) {
  const { error } = await supabase.rpc("delete_messages_including_and_after", {
    p_user_id: userId,
    p_chat_id: chatId,
    p_sequence_number: sequenceNumber
  })

  if (error) {
    return {
      success: false,
      error: "Failed to delete messages."
    }
  }

  return {
    success: true,
    error: null
  }
}
