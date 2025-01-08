"use client"

import { PentestGPTContext } from "@/context/context"
import { useContext, useEffect, useState } from "react"

const MAX_TITLE_LENGTH = 50

function truncateChatName(name: string): string {
  if (!name) return "PentestGPT"
  return name.length > MAX_TITLE_LENGTH
    ? `${name.slice(0, MAX_TITLE_LENGTH)}...`
    : name
}

export default function ChatLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { selectedChat } = useContext(PentestGPTContext)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && selectedChat) {
      const truncatedName = truncateChatName(selectedChat.name)
      document.title = `${truncatedName}`
    }
  }, [selectedChat, mounted])

  return children
}
