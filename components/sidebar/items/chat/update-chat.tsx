import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PentestGPTContext } from "@/context/context"
import { updateChat } from "@/db/chats"
import { Tables } from "@/supabase/types"
import { IconEdit } from "@tabler/icons-react"
import { FC, useContext, useState, useCallback, useRef } from "react"

interface UpdateChatProps {
  chat: Tables<"chats">
  onAction: () => void
}

export const UpdateChat: FC<UpdateChatProps> = ({ chat, onAction }) => {
  const { setChats } = useContext(PentestGPTContext)
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(chat.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpdateChat = useCallback(
    async (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (name.trim() && name !== chat.name) {
        const updatedChat = await updateChat(chat.id, { name: name.trim() })
        setChats(prevChats =>
          prevChats.map(c => (c.id === chat.id ? updatedChat : c))
        )
      }
      setIsOpen(false)
      onAction()
    },
    [chat.id, name, chat.name, setChats, onAction]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation()
      if (e.key === "Enter") {
        handleUpdateChat(e)
      }
    },
    [handleUpdateChat]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setName(chat.name)
        setTimeout(() => inputRef.current?.focus(), 0)
      } else {
        onAction()
      }
      setIsOpen(open)
    },
    [chat.name, onAction]
  )

  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(true)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="w-full cursor-pointer" onClick={handleTriggerClick}>
          <div className="flex items-center p-3 hover:opacity-50">
            <IconEdit size={20} className="mr-2" />
            <span>Rename</span>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor="chatName">Name</Label>
          <Input
            id="chatName"
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateChat}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
