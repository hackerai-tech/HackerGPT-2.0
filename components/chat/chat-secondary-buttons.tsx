import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { PentestGPTContext } from "@/context/context"
import { IconMessagePlus } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { WithTooltip } from "../ui/with-tooltip"
import { ShareChatButton } from "./chat-share-button"

interface ChatSecondaryButtonsProps {}

export const ChatSecondaryButtons: FC<ChatSecondaryButtonsProps> = ({}) => {
  const { selectedChat } = useContext(PentestGPTContext)
  const { handleNewChat } = useChatHandler()

  if (!selectedChat) return null

  return (
    <div className="flex items-center space-x-4">
      <ShareChatButton />

      <WithTooltip
        delayDuration={200}
        display={<div>Start a new chat</div>}
        trigger={
          <div className="mt-1">
            <IconMessagePlus
              className="cursor-pointer hover:opacity-50"
              size={24}
              onClick={handleNewChat}
            />
          </div>
        }
      />
    </div>
  )
}
