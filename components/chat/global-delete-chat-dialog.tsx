import { FC, useCallback, useContext } from "react"
import { PentestGPTContext } from "@/context/context"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { deleteChat } from "@/db/chats"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

interface GlobalDeleteChatDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const GlobalDeleteChatDialog: FC<GlobalDeleteChatDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { setChats, selectedChat } = useContext(PentestGPTContext)
  const { handleNewChat } = useChatHandler()

  const handleDeleteChat = useCallback(async () => {
    if (selectedChat) {
      await deleteChat(selectedChat.id)
      setChats(prevState => prevState.filter(c => c.id !== selectedChat.id))
      onOpenChange(false)
      handleNewChat()
    }
  }, [selectedChat, setChats, onOpenChange, handleNewChat])

  if (!selectedChat) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Delete Chat?</DialogTitle>
          <DialogDescription>
            <br />
            This will delete &quot;{selectedChat.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
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
