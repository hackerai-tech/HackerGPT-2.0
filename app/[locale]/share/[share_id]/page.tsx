import React from "react"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SharedMessage } from "@/components/chat/shared-message"

const MAX_CHAT_NAME_LENGTH = 100

const truncateChatName = (name: string) => {
  if (name.length <= MAX_CHAT_NAME_LENGTH) return name
  return name.slice(0, MAX_CHAT_NAME_LENGTH) + "..."
}

export default async function SharedChatPage({
  params
}: {
  params: { share_id: string; locale: string }
}) {
  const supabase = createClient(cookies())

  const { data: chatData } = await supabase
    .from("chats")
    .select("*")
    .eq("last_shared_message_id", params.share_id)
    .single()

  if (!chatData) {
    return <ErrorUI error="Chat not found" />
  }

  const { data: messagesData, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatData.id)
    .order("created_at", { ascending: true })
    .limit(50)

  if (messagesError) {
    console.error("messagesError", messagesError)
    return <ErrorUI error={messagesError.message} />
  }

  const lastSharedMessageIndex = messagesData.findIndex(
    message => message.id === params.share_id
  )

  const messages = messagesData.slice(0, lastSharedMessageIndex + 2)

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
    return new Date(dateString).toLocaleDateString(params.locale, options)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="grow">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
          <div className="text-left">
            <h1 className="text-2xl font-bold">
              {truncateChatName(chatData.name)}
            </h1>
            <div className="text-foreground/50">
              {formatDate(chatData.shared_at)}
            </div>
          </div>
          <div className="space-y-8">
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
      </div>
      <div className="bg-background sticky bottom-0 py-4 shadow-md">
        <div className="text-bold flex justify-center">
          <Link href={`/login`}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-3 font-semibold transition-colors">
              Get started with PentestGPT
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function ErrorUI({ error }: { error: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold">Oops, Something went wrong!</h1>
        <p className="mb-8 text-xl">{error}</p>
        <Link href="/">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-3 font-semibold transition-colors">
            Go back to home
          </Button>
        </Link>
      </div>
    </div>
  )
}