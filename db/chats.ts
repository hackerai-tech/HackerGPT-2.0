import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getChatById = async (chatId: string) => {
  const { data: chat } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .maybeSingle()

  return chat
}

export const createChat = async (chat: TablesInsert<"chats">) => {
  const { data: createdChat, error } = await supabase
    .from("chats")
    .insert([chat])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdChat
}

export const updateChat = async (
  chatId: string,
  chat: TablesUpdate<"chats">
) => {
  const { data: updatedChat, error } = await supabase
    .from("chats")
    .update(chat)
    .eq("id", chatId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedChat
}

export const deleteChat = async (chatId: string) => {
  const { error } = await supabase.from("chats").delete().eq("id", chatId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteAllChats = async (userId: string) => {
  const { error: chatDeleteError } = await supabase
    .from("chats")
    .delete()
    .eq("user_id", userId)

  if (chatDeleteError) {
    throw new Error(chatDeleteError.message)
  }

  const { error: chatMessageDeleteError } = await supabase
    .from("chat_files")
    .delete()
    .eq("user_id", userId)

  if (chatMessageDeleteError) {
    throw new Error(chatMessageDeleteError.message)
  }

  return true
}

export const getChatsByUserId = async (userId: string) => {
  const { data: chats, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25)

  if (error) {
    throw new Error(error.message)
  }

  return chats
}

export const getMoreChatsByUserId = async (
  userId: string,
  lastChatCreatedAt: string
) => {
  const { data: chats, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .lt("created_at", lastChatCreatedAt)
    .order("created_at", { ascending: false })
    .limit(25)

  if (error) {
    throw new Error(error.message)
  }

  return chats
}
