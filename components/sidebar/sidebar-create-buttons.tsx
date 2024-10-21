import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ContentType } from "@/types"
import { IconPlus, IconRefresh } from "@tabler/icons-react"
import { FC, useContext, useState } from "react"
import { Button } from "../ui/button"
import { CreateFile } from "./items/files/create-file"
import { PentestGPTContext } from "@/context/context"

interface SidebarCreateButtonsProps {
  contentType: ContentType
  handleSidebarVisibility: () => void
}

export const SidebarCreateButtons: FC<SidebarCreateButtonsProps> = ({
  contentType,
  handleSidebarVisibility
}) => {
  const { isTemporaryChat, setTemporaryChatMessages } =
    useContext(PentestGPTContext)
  const { handleNewChat } = useChatHandler()

  const [isCreatingFile, setIsCreatingFile] = useState(false)

  const getCreateFunction = () => {
    switch (contentType) {
      case "chats":
        if (isTemporaryChat) {
          return () => {
            setTemporaryChatMessages([])
            handleSidebarVisibility()
          }
        }
        return async () => {
          handleNewChat()
          handleSidebarVisibility()
        }

      case "files":
        return async () => {
          setIsCreatingFile(true)
        }

      default:
        break
    }
  }

  return (
    <div className="flex w-full space-x-2">
      <Button className="flex h-[36px] grow" onClick={getCreateFunction()}>
        {isTemporaryChat && contentType === "chats" ? (
          <IconRefresh className="mr-1" size={20} />
        ) : (
          <IconPlus className="mr-1" size={20} />
        )}
        {isTemporaryChat && contentType === "chats"
          ? "Clear Chat"
          : `New ${
              contentType.charAt(0).toUpperCase() +
              contentType.slice(1, contentType.length - 1)
            }`}
      </Button>

      {isCreatingFile && (
        <CreateFile isOpen={isCreatingFile} onOpenChange={setIsCreatingFile} />
      )}
    </div>
  )
}
