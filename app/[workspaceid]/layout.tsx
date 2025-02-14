"use client"

import { Dashboard } from "@/components/ui/dashboard"
import { PentestGPTContext } from "@/context/context"
import { getChatsByUserId } from "@/db/chats"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getWorkspaceById } from "@/db/workspaces"
import { supabase } from "@/lib/supabase/browser-client"
import { useParams, useRouter } from "next/navigation"
import { ReactNode, useContext, useEffect, useState } from "react"
import Loading from "../loading"
import { getSubscriptionByUserId } from "@/db/subscriptions"
import { useUIContext } from "@/context/ui-context"
import { LargeModel, SmallModel } from "@/lib/models/llm/hackerai-llm-list"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.workspaceid as string

  const {
    setChatSettings,
    setChats,
    setFiles,
    setSelectedWorkspace,
    setSelectedChat,
    setChatMessages,
    setUserInput,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay
  } = useContext(PentestGPTContext)

  const { setIsGenerating, setFirstTokenReceived } = useUIContext()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeWorkspace = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        return router.push("/login")
      }

      const subscription = await getSubscriptionByUserId(user.id)

      setChatSettings({
        model:
          subscription?.status === "active"
            ? LargeModel.modelId
            : SmallModel.modelId,
        includeProfileContext: true
      })

      await fetchWorkspaceData(workspaceId, user.id)

      // Reset chat-specific states
      setUserInput("")
      setChatMessages([])
      setSelectedChat(null)
      setIsGenerating(false)
      setFirstTokenReceived(false)
      setChatFiles([])
      setChatImages([])
      setNewMessageFiles([])
      setNewMessageImages([])
      setShowFilesDisplay(false)
    }

    initializeWorkspace()
  }, [workspaceId])

  const fetchWorkspaceData = async (workspaceId: string, userId: string) => {
    setLoading(true)

    try {
      const workspace = await getWorkspaceById(workspaceId)

      if (!workspace) {
        router.push("/")
        return
      }
      setSelectedWorkspace(workspace)

      const [chats, fileData] = await Promise.all([
        getChatsByUserId(userId),
        getFileWorkspacesByWorkspaceId(workspaceId)
      ])

      setChats(chats)
      setFiles(fileData.files)
    } catch (error) {
      console.error("Error fetching workspace data:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  return <Dashboard>{children}</Dashboard>
}
