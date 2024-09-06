import React from "react"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { Tables } from "@/supabase/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"
import { SharedMessage } from "@/components/chat/shared-message"

export default async function SharedChatPage({
  params
}: {
  params: { share_id: string; locale: string }
}) {
  const supabase = createClient(cookies())

  let messages: Tables<"messages">[] = []

  const { data: chatData } = await supabase
    .from("chats")
    .select("*")
    .eq("last_shared_message_id", params.share_id)
    .single()

  if (!chatData) {
    console.error("chatData not found")
    return notFound()
  }

  const { data: messagesData, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatData.id)
    .order("created_at", { ascending: true })

  if (messagesError) {
    console.error("messagesError", messagesError)
    return notFound()
  }

  messages = messagesData

  // cut messages after last shared message
  const lastSharedMessageIndex = messages.findIndex(
    message => message.id === params.share_id
  )

  if (lastSharedMessageIndex === -1) {
    console.error("lastSharedMessageIndex not found")
    return notFound()
  }

  messages = messages.slice(0, lastSharedMessageIndex + 1)

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
    return new Date(dateString).toLocaleDateString(params.locale, options)
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="grow space-y-2">
        <h1 className="text-2xl font-bold">{chatData.name}</h1>
        <div className="text-foreground/50">
          {formatDate(chatData.shared_at)}
        </div>
        <div className="mb-8">
          {messages.map((message, index, array) => (
            <SharedMessage
              key={message.id}
              message={message}
              previousMessage={array[index - 1]}
              isLast={index === array.length - 1}
            />
          ))}
        </div>
      </div>
      <div className="mb-4 mt-8 flex justify-center">
        <Link href={`/login`}>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-3 transition-colors">
            Get started with PentestGPT
          </Button>
        </Link>
      </div>
    </div>
  )
}
