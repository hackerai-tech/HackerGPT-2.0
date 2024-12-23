import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { PentestGPTContext } from "@/context/context"
import { IconMessagePlus } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { WithTooltip } from "../ui/with-tooltip"

interface ChatSecondaryButtonsProps {}

export const ChatSecondaryButtons: FC<ChatSecondaryButtonsProps> = ({}) => {
  const { selectedChat } = useContext(PentestGPTContext)
  const { handleNewChat } = useChatHandler()

  if (!selectedChat) return null

  return (
    <div className="flex items-center pl-3">
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
