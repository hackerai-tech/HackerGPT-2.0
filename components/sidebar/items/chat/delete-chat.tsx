import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { PentestGPTContext } from "@/context/context"
import { deleteChat } from "@/db/chats"
import useHotkey from "@/lib/hooks/use-hotkey"
import { Tables } from "@/supabase/types"
import { IconTrash } from "@tabler/icons-react"
import { FC, useContext, useCallback, useState } from "react"

interface DeleteChatProps {
  chat: Tables<"chats">
  onAction: () => void
}

export const DeleteChat: FC<DeleteChatProps> = ({ chat, onAction }) => {
  const { setChats } = useContext(PentestGPTContext)
  const { handleNewChat } = useChatHandler()
  const [isOpen, setIsOpen] = useState(false)

  const handleDeleteChat = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      await deleteChat(chat.id)
      setChats(prevState => prevState.filter(c => c.id !== chat.id))
      setIsOpen(false)
      onAction()
      handleNewChat()
    },
    [chat.id, setChats, onAction, handleNewChat]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      if (!open) {
        onAction()
      }
    },
    [onAction]
  )

  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(true)
  }, [])

  useHotkey("Backspace", () => setIsOpen(true))

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="w-full cursor-pointer" onClick={handleTriggerClick}>
          <div className="text-error flex items-center p-3 hover:opacity-50">
            <IconTrash className="mr-2" size={20} />
            <span>Delete</span>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Delete Chat?</DialogTitle>
          <DialogDescription>
            <br />
            This will delete &quot;{chat.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteChat}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
