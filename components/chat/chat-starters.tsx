import { availablePlugins } from "@/lib/tools/tool-store/available-tools"
import { ChatMessage } from "@/types"
import { PluginID } from "@/types/plugins"
import React, { memo, useContext } from "react"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { dragHelper } from "@/components/chat/chat-helpers/drag"
import { PentestGPTContext } from "@/context/context"
import { cn } from "@/lib/utils"

const InfoCard: React.FC<{
  title: string
  description: string
  onClick: () => void
  isTemporaryChat: boolean
}> = ({ title, description, onClick, isTemporaryChat }) => (
  <button
    className={cn(
      "min-w-72 rounded-xl p-3.5 text-left duration-300 ease-in-out focus:outline-none",
      "hover:bg-select",
      isTemporaryChat ? "bg-tertiary" : "bg-secondary"
    )}
    onClick={onClick}
  >
    <div className="pb-1 text-sm font-bold">{title}</div>
    <div className="text-xs opacity-75">{description}</div>
  </button>
)

interface ChatStartersProps {
  selectedPlugin: PluginID
  chatMessages: ChatMessage[]
}

const ChatStarters: React.FC<ChatStartersProps> = ({
  selectedPlugin,
  chatMessages
}) => {
  const { userInput, newMessageFiles, newMessageImages, isTemporaryChat } =
    useContext(PentestGPTContext)
  const { handleSendMessage } = useChatHandler()

  const pluginStarters = availablePlugins.find(
    plugin => plugin.value === selectedPlugin
  )?.starters

  if (userInput || newMessageFiles.length > 0 || newMessageImages.length > 0) {
    return null
  }

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[800px] px-4 pb-1 md:px-8">
        <div
          className={cn(
            "scrollbar-hide flex w-[calc(100vw-2rem)] gap-2 overflow-x-auto pb-1 pt-2",
            "sm:scrollbar-show sm:w-full sm:max-w-[800px]",
            "lg:grid lg:grid-cols-2"
          )}
          style={{ cursor: "grab" }}
          onMouseDown={dragHelper}
        >
          {selectedPlugin &&
            pluginStarters?.map((starter, index) => (
              <InfoCard
                key={`${selectedPlugin}-${starter.title}-${index}`}
                title={starter.title}
                description={starter.description}
                onClick={() =>
                  handleSendMessage(starter.chatMessage, chatMessages, false)
                }
                isTemporaryChat={isTemporaryChat}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

export default memo(ChatStarters)
