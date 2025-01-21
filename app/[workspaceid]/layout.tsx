"use client"

import { Dashboard } from "@/components/ui/dashboard"
import { PentestGPTContext } from "@/context/context"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getWorkspaceById } from "@/db/workspaces"
import { supabase } from "@/lib/supabase/browser-client"
import { LLMID } from "@/types"
import { useParams, useRouter } from "next/navigation"
import { ReactNode, useContext, useEffect, useState } from "react"
import Loading from "../loading"

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
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay
  } = useContext(PentestGPTContext)

  const [loading, setLoading] = useState(true)

  useEffect(() => {    
    const initializeWorkspace = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        return router.push("/login")
      }

      await fetchWorkspaceData(workspaceId)
      
      // Reset states
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

  const fetchWorkspaceData = async (workspaceId: string) => {
    setLoading(true)

    try {
      const workspace = await getWorkspaceById(workspaceId)

      if (!workspace) {
        router.push("/")
        return
      }
      setSelectedWorkspace(workspace)

      const [chats, fileData] = await Promise.all([
        getChatsByWorkspaceId(workspaceId),
        getFileWorkspacesByWorkspaceId(workspaceId)
      ])

      setChats(chats)
      setFiles(fileData.files)

      setChatSettings({
        model: "mistral-medium" as LLMID,
        includeProfileContext: workspace?.include_profile_context || true,
        embeddingsProvider: "openai"
      })
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
