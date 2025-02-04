import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { IconMessagePlus } from "@tabler/icons-react"
import { FC } from "react"
import { WithTooltip } from "../ui/with-tooltip"

export const ChatSecondaryButtons: FC = () => {
  const { handleNewChat } = useChatHandler()

  return (
    <div className="flex items-center pl-3">
      <WithTooltip
        display={<div className="font-normal">New chat</div>}
        trigger={
          <IconMessagePlus
            className="cursor-pointer hover:opacity-50"
            size={24}
            onClick={handleNewChat}
          />
        }
        side="bottom"
      />
    </div>
  )
}
