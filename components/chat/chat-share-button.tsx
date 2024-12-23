import React, { useState, useEffect, useContext } from "react"
import { Button } from "@/components/ui/button"
import {
  IconX,
  IconLink,
  IconBrandLinkedin,
  IconBrandFacebook,
  IconBrandReddit,
  IconBrandX,
  IconShare2
} from "@tabler/icons-react"
import { supabase } from "@/lib/supabase/browser-client"
import { PentestGPTContext } from "@/context/context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { updateChat } from "@/db/chats"
import { CopyButton } from "@/components/ui/copy-button"
import { toast } from "sonner"
import { getMessagesByChatId } from "@/db/messages"
import { Tables } from "@/supabase/types"
import { WithTooltip } from "../ui/with-tooltip"

interface ShareChatButtonProps {
  children?: React.ReactNode
  chat?: Tables<"chats">
}

export const ShareChatButton: React.FC<ShareChatButtonProps> = ({
  children,
  chat
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const { profile, selectedWorkspace, selectedChat } =
    useContext(PentestGPTContext)

  const chatToShare = chat || selectedChat

  useEffect(() => {
    if (isDialogOpen) {
      checkIfShared()
    }
  }, [isDialogOpen, chatToShare])

  const checkIfShared = async () => {
    if (!chatToShare) return

    const { data, error } = await supabase
      .from("chats")
      .select("last_shared_message_id")
      .eq("id", chatToShare.id)
      .eq("sharing", "public")
      .single()

    if (data?.last_shared_message_id) {
      setShareUrl(
        `${window.location.origin}/share/${data.last_shared_message_id}`
      )
    } else {
      setShareUrl("")
    }
  }

  const handleShareChat = async () => {
    if (!chatToShare || !profile?.user_id || !selectedWorkspace?.id) return

    try {
      setIsLoading(true)

      const messages = await getMessagesByChatId(chatToShare.id)

      if (messages.length === 0) {
        setIsLoading(false)
        return
      }

      const lastMessage = messages[messages.length - 1]

      await updateChat(chatToShare.id, {
        sharing: "public",
        last_shared_message_id: lastMessage.id,
        shared_by: profile.user_id,
        shared_at: new Date().toISOString()
      })

      setShareUrl(`${window.location.origin}/share/${lastMessage.id}`)
      setIsLoading(false)
    } catch (error) {
      toast.error("Error sharing chat")
      console.error("Error sharing chat:", error)
      setIsLoading(false)
    }
  }

  const handleSocialShare = (platform: string) => {
    let url = ""
    const text = "Check out this chat!"

    switch (platform) {
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        break
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        break
      case "reddit":
        url = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`
        break
      case "twitter":
        url = `https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
        break
    }

    window.open(url, "_blank")
  }

  const handleOpenDialog = async () => {
    setIsDialogOpen(true)
    await checkIfShared()
  }

  if (!chatToShare) return null

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          {children ? (
            <div onClick={handleOpenDialog}>{children}</div>
          ) : (
            <WithTooltip
              delayDuration={200}
              display={"Share"}
              trigger={
                <IconShare2
                  className="mr-2 cursor-pointer hover:opacity-50"
                  size={24}
                  stroke={2}
                  onClick={handleOpenDialog}
                />
              }
              side="bottomRight"
            />
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {shareUrl ? "Update" : "Create"} public link
            </DialogTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="absolute right-4 top-4"
            >
              <IconX className="size-4" />
            </Button>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <p className="text-sm text-gray-500">
              {shareUrl
                ? "The public link to your chat has been updated."
                : "Generate a public link to share your chat."}
            </p>
            <div className="flex items-center space-x-2">
              {shareUrl && <Input value={shareUrl} readOnly className="grow" />}
              <Button
                loading={isLoading}
                variant="outline"
                onClick={handleShareChat}
              >
                <IconLink className="mr-2 size-4" />
                {shareUrl ? "Update" : "Generate"} link
              </Button>
              {shareUrl && (
                <CopyButton
                  variant={"outline"}
                  className={"text-foreground size-10 shrink-0"}
                  value={shareUrl}
                />
              )}
            </div>
            {shareUrl && (
              <div className="flex justify-center space-x-4">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleSocialShare("linkedin")}
                >
                  <IconBrandLinkedin className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleSocialShare("facebook")}
                >
                  <IconBrandFacebook className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleSocialShare("reddit")}
                >
                  <IconBrandReddit className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleSocialShare("twitter")}
                >
                  <IconBrandX className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
