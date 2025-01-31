import React, { useState, useEffect, useContext } from "react"
import { DialogPanel, DialogTitle } from "@headlessui/react"
import { Button } from "../../ui/button"
import { IconTrash, IconX, IconLoader2 } from "@tabler/icons-react"
import { supabase } from "@/lib/supabase/browser-client"
import { PentestGPTContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { updateChat } from "@/db/chats"
import { toast } from "sonner"
import Link from "next/link"
import { TransitionedDialog } from "@/components/ui/transitioned-dialog"

interface SharedChatsPopupProps {
  isOpen: boolean
  onClose: () => void
}

export const SharedChatsPopup: React.FC<SharedChatsPopupProps> = ({
  isOpen,
  onClose
}) => {
  const [sharedChats, setSharedChats] = useState<Tables<"chats">[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const { profile } = useContext(PentestGPTContext)

  useEffect(() => {
    if (profile?.user_id) {
      fetchSharedChats()
    }
  }, [profile?.user_id])

  const fetchSharedChats = async () => {
    if (!profile?.user_id) return
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("sharing", "public")
        .order("shared_at", { ascending: false })

      if (error) throw error
      setSharedChats(data || [])
    } catch (error) {
      console.error("Error fetching shared chats:", error)
      toast.error("Failed to fetch shared chats")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMakePrivate = async (chatId: string) => {
    setDeletingChatId(chatId)
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
    } finally {
      setDeletingChatId(null)
    }
  }

  const handleMakeAllPrivate = async () => {
    setIsDeletingAll(true)
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
    } finally {
      setIsDeletingAll(false)
    }
  }

  return (
    <TransitionedDialog isOpen={isOpen} onClose={onClose}>
      <DialogPanel className="bg-popover max-h-[90vh] w-full max-w-4xl overflow-hidden overflow-y-auto rounded-2xl p-6 text-left align-middle shadow-xl transition-all">
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
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <IconLoader2 className="animate-spin" size={24} />
            </div>
          ) : sharedChats.length === 0 ? (
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
                  <th className="pb-2 text-right font-medium"></th>
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
                        disabled={deletingChatId === chat.id}
                      >
                        {deletingChatId === chat.id ? (
                          <IconLoader2 className="animate-spin" size={16} />
                        ) : (
                          <IconTrash size={16} />
                        )}
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
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <>
                  <IconLoader2 className="mr-2 animate-spin" size={16} />
                  Deleting...
                </>
              ) : (
                "Delete all shared links"
              )}
            </Button>
          </div>
        )}
      </DialogPanel>
    </TransitionedDialog>
  )
}
