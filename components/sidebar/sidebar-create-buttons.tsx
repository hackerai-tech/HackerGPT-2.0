import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ContentType } from "@/types"
import { IconMessagePlus, IconRefresh } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { Button } from "../ui/button"
import { PentestGPTContext } from "@/context/context"
import { SIDEBAR_ICON_SIZE } from "./sidebar-content"
import { WithTooltip } from "../ui/with-tooltip"

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

      default:
        break
    }
  }

  return (
    <div className="flex">
      <WithTooltip
        display={
          isTemporaryChat && contentType === "chats" ? "Clear chat" : "New chat"
        }
        trigger={
          <Button
            variant="ghost"
            className="size-10 p-0"
            onClick={getCreateFunction()}
          >
            {isTemporaryChat && contentType === "chats" ? (
              <IconRefresh size={SIDEBAR_ICON_SIZE} />
            ) : (
              <IconMessagePlus size={SIDEBAR_ICON_SIZE} />
            )}
          </Button>
        }
        side="bottom"
      />
    </div>
  )
}
