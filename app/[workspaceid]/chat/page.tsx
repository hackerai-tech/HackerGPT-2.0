"use client"

import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatSettings } from "@/components/chat/chat-settings"
import ChatStarters from "@/components/chat/chat-starters"
import { ChatUI } from "@/components/chat/chat-ui"
import { PentestGPTContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { useContext } from "react"
import { availablePlugins } from "@/lib/tools/tool-store/available-tools"
import { ChatPluginInfo } from "@/components/chat/chat-plugin-info"
import { TemporaryChatInfo } from "@/components/chat/temporary-chat-info"
import { Settings } from "@/components/utility/settings"
import { WithTooltip } from "@/components/ui/with-tooltip"
import { useUIContext } from "@/context/ui-context"

export default function ChatPage() {
  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const { chatMessages, temporaryChatMessages, isTemporaryChat } =
    useContext(PentestGPTContext)

  const { selectedPlugin, isMobile } = useUIContext()

  const { handleNewChat, handleFocusChatInput } = useChatHandler()

  const selectedPluginInfo =
    selectedPlugin && selectedPlugin !== "none"
      ? availablePlugins.find(plugin => plugin.value === selectedPlugin)
      : undefined

  const messagesToDisplay = isTemporaryChat
    ? temporaryChatMessages
    : chatMessages

  return (
    <>
      {messagesToDisplay.length === 0 ? (
        <div className="relative flex h-full flex-col items-center justify-center">
          <div
            className={`absolute left-1/2 -translate-x-1/2 ${isMobile && (selectedPluginInfo || isTemporaryChat) ? "-translate-y-2/4" : "-translate-y-3/4"}`}
          >
            {selectedPluginInfo ? (
              <ChatPluginInfo pluginInfo={selectedPluginInfo} />
            ) : isTemporaryChat ? (
              <TemporaryChatInfo />
            ) : isMobile ? (
              <div className="-mx-24 mb-12">
                <h1 className="text-2xl font-semibold">
                  What can I help with?
                </h1>
              </div>
            ) : (
              <div className="-mx-24 mb-14">
                <h1 className="text-3xl font-semibold">
                  What can I help with?
                </h1>
              </div>
            )}
          </div>

          <div className="absolute right-[22px] top-1 flex h-[40px] items-center space-x-2">
            {!isMobile && (
              <WithTooltip
                display={<div>Settings</div>}
                trigger={<Settings />}
              />
            )}
          </div>

          <ChatSettings />

          <div className="flex grow flex-col items-center justify-center" />

          <ChatStarters
            selectedPlugin={selectedPlugin}
            chatMessages={chatMessages}
          />

          <ChatInput />

          <ChatHelp />
        </div>
      ) : (
        <ChatUI />
      )}
    </>
  )
}
