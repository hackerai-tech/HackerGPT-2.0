import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { PentestGPTContext } from "@/context/context"
import { IconMessagePlus } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { WithTooltip } from "../ui/with-tooltip"
import { ShareChatButton } from "./chat-share-button"

interface ChatSecondaryButtonsProps {}

export const ChatSecondaryButtons: FC<ChatSecondaryButtonsProps> = ({}) => {
  const { selectedChat, isMobile } = useContext(PentestGPTContext)
  const { handleNewChat } = useChatHandler()

  if (!selectedChat) return null

  return (
    <div className="flex items-center space-x-4">
      {!isMobile && <ShareChatButton />}

      <WithTooltip
        delayDuration={200}
        display={"New chat"}
        trigger={
          <IconMessagePlus
            className="cursor-pointer hover:opacity-50"
            size={24}
            onClick={handleNewChat}
          />
        }
        side="bottomRight"
      />
    </div>
  )
}
