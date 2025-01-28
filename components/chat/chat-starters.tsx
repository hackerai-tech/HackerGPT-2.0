import { availablePlugins } from "@/lib/tools/tool-store/available-tools"
import { ChatMessage } from "@/types"
import { ChatStarter, PluginID } from "@/types/plugins"
import React, { memo, useContext } from "react"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { dragHelper } from "@/components/chat/chat-helpers/drag"
import { PentestGPTContext } from "@/context/context"

const InfoCard: React.FC<{
  title: string
  description: string
  onClick: () => void
  isTemporaryChat: boolean
}> = ({ title, description, onClick, isTemporaryChat }) => {
  return (
    <button
      className={`${
        isTemporaryChat ? "bg-tertiary" : "bg-secondary"
      } hover:bg-select min-w-72 rounded-xl p-3.5 text-left duration-300 ease-in-out focus:outline-none`}
      onClick={onClick}
    >
      <div className="pb-1 text-sm font-bold">{title}</div>
      <div className="text-xs opacity-75">{description}</div>
    </button>
  )
}

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
  const chatHandler = useChatHandler()
  const pluginStarters = availablePlugins.find(
    (plugin: { value: PluginID }) => plugin.value === selectedPlugin
  )?.starters

  const handleSendMessage = chatHandler.handleSendMessage

  if (userInput || newMessageFiles.length > 0 || newMessageImages.length > 0) {
    return null
  }

  return (
    <div className="flex w-full items-center justify-start">
      <div
        className="scrollbar-hide flex w-screen flex-nowrap gap-2 overflow-x-auto lg:grid lg:grid-cols-2"
        style={{ cursor: "grab" }}
        onMouseDown={dragHelper}
      >
        {selectedPlugin &&
          pluginStarters?.map((starter: ChatStarter, index) => (
            <InfoCard
              title={starter.title}
              description={starter.description}
              key={`${selectedPlugin} ${starter.title} ${index}`}
              onClick={() =>
                handleSendMessage(starter.chatMessage, chatMessages, false)
              }
              isTemporaryChat={isTemporaryChat}
            />
          ))}
      </div>
    </div>
  )
}

export default memo(ChatStarters)
