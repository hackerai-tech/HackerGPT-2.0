import React, { useState, useEffect, useContext } from "react"
import { Dialog, DialogContent, DialogTitle } from "../../ui/dialog"
import { Button } from "../../ui/button"
import { IconTrash, IconX } from "@tabler/icons-react"
import { supabase } from "@/lib/supabase/browser-client"
import { PentestGPTContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { updateChat } from "@/db/chats"
import { toast } from "sonner"
import Link from "next/link"

interface SharedChatsPopupProps {
  isOpen: boolean
  onClose: () => void
}

export const SharedChatsPopup: React.FC<SharedChatsPopupProps> = ({
  isOpen,
  onClose
}) => {
  const [sharedChats, setSharedChats] = useState<Tables<"chats">[]>([])
  const { profile, isMobile } = useContext(PentestGPTContext)

  useEffect(() => {
    if (isOpen && profile?.user_id) {
      fetchSharedChats()
    }
  }, [isOpen, profile?.user_id])

  const fetchSharedChats = async () => {
    if (!profile?.user_id) return

    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", profile.user_id)
      .eq("sharing", "public")
      .order("shared_at", { ascending: false })

    if (error) {
      console.error("Error fetching shared chats:", error)
      toast.error("Failed to fetch shared chats")
    } else {
      setSharedChats(data || [])
    }
  }

  const handleMakePrivate = async (chatId: string) => {
    try {
      await updateChat(chatId, {
        sharing: "private",
        last_shared_message_id: null,
        shared_by: null,
        shared_at: null
      })
      toast.success("Shared link deleted successfully")
      fetchSharedChats()
    } catch (error) {
      console.error("Error deleting shared link:", error)
      toast.error("Failed to delete shared link")
    }
  }

  const handleMakeAllPrivate = async () => {
    try {
      await Promise.all(
        sharedChats.map(chat =>
          updateChat(chat.id, {
            sharing: "private",
            last_shared_message_id: null,
            shared_by: null,
            shared_at: null
          })
        )
      )
      toast.success("All shared links deleted successfully")
      fetchSharedChats()
    } catch (error) {
      console.error("Error deleting all shared links:", error)
      toast.error("Failed to delete all shared links")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`
          bg-popover overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all
          ${isMobile ? "w-full px-4" : "w-full max-w-4xl md:min-w-[800px]"}
          max-h-[90vh] overflow-y-auto
        `}
      >
        <div className="mb-4 flex items-center justify-between">
          <DialogTitle className="text-xl font-medium leading-6">
            Shared Links
          </DialogTitle>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="hover:bg-muted rounded-full p-2 transition-colors"
          >
            <IconX size={20} />
          </Button>
        </div>
        <div className="mt-4 grow overflow-x-auto">
          {sharedChats.length === 0 ? (
            <p className="text-sm text-gray-500">No shared links found.</p>
          ) : (
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: "50%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium">Name</th>
                  <th className="pb-2 text-left font-medium">Date Shared</th>
                </tr>
              </thead>
              <tbody>
                {sharedChats.map(chat => (
                  <tr key={chat.id} className="border-b">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/share/${chat.last_shared_message_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-words text-sm text-blue-500 transition-colors duration-200 hover:text-blue-700"
                      >
                        {chat.name || "Unnamed Chat"}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-gray-500">
                        {new Date(chat.shared_at!).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMakePrivate(chat.id)}
                        className="transition-colors hover:bg-red-100 hover:text-red-600"
                        title="Delete shared link"
                      >
                        <IconTrash size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {sharedChats.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="destructive"
              onClick={handleMakeAllPrivate}
              className="text-sm"
            >
              Delete all shared links
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
