"use client"

import { PentestGPTContext } from "@/context/context"
import { useContext, useEffect, useState } from "react"

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
      document.title = `${selectedChat.name}`
    } else {
      document.title = "PentestGPT"
    }
  }, [selectedChat, mounted])

  return children
} 