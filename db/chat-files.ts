import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"

export const getChatFilesByChatId = async (chatId: string) => {
  const { data: chatFiles, error } = await supabase
    .from("chats")
    .select(
      `
      id, 
      name, 
      files (*)
    `
    )
    .eq("id", chatId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned, chat not found
      return null
    }
    // For other types of errors, we still throw
    throw new Error(`Error fetching chat files: ${error.message}`)
  }

  return chatFiles
}

export const createChatFile = async (chatFile: TablesInsert<"chat_files">) => {
  const { data: createdChatFile, error } = await supabase
    .from("chat_files")
    .insert(chatFile)
    .select("*")

  if (!createdChatFile) {
    throw new Error(error.message)
  }

  return createdChatFile
}

export const createChatFiles = async (
  chatFiles: TablesInsert<"chat_files">[]
) => {
  const { data: createdChatFiles, error } = await supabase
    .from("chat_files")
    .insert(chatFiles)
    .select("*")

  if (!createdChatFiles) {
    throw new Error(error.message)
  }

  return createdChatFiles
}
