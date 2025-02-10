import { PentestGPTContext } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { IconChevronDown, IconRefresh } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { ModelSelect } from "../models/model-select"
import { WithTooltip } from "../ui/with-tooltip"
import { ChatSecondaryButtons } from "./chat-secondary-buttons"
import { useUIContext } from "@/context/ui-context"

interface ChatSettingsProps {
  handleCleanChat?: () => void
}

export const ChatSettings: FC<ChatSettingsProps> = ({ handleCleanChat }) => {
  const {
    chatSettings,
    setChatSettings,
    profile,
    isPremiumSubscription,
    isTemporaryChat
  } = useContext(PentestGPTContext)

  const { isMobile, showSidebar } = useUIContext()

  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  if (!chatSettings || !profile) return null

  const fullModel = LLM_LIST.find(llm => llm.modelId === chatSettings.model)

  return (
    <div
      className={`flex h-[50px] w-full items-center justify-center font-bold sm:justify-start ${showSidebar ? "sm:pl-2" : "sm:pl-12"}`}
    >
      <div className="mt-2 max-w-[230px] truncate text-sm sm:max-w-[800px] sm:text-base">
        <div className={`flex items-center ${!isMobile && "gap-3"}`}>
          {!isMobile && !showSidebar && (
            <>
              {!isTemporaryChat ? (
                <ChatSecondaryButtons />
              ) : (
                <div className="pl-3">
                  <WithTooltip
                    display="Clear chat"
                    trigger={
                      <IconRefresh
                        className="cursor-pointer hover:opacity-50"
                        size={24}
                        onClick={handleCleanChat}
                      />
                    }
                    side="bottom"
                  />
                </div>
              )}
            </>
          )}

          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                ref={buttonRef}
                className={`flex items-center space-x-1 px-2 py-1 ${isOpen ? "bg-accent" : ""}`}
                variant="ghost"
              >
                <div className="text-xl">
                  {!isPremiumSubscription
                    ? "PentestGPT"
                    : fullModel?.modelName || chatSettings.model}
                </div>

                <IconChevronDown className="ml-1" size={18} />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="bg-secondary relative mt-1 flex max-h-[calc(100vh-120px)] w-full min-w-[340px] max-w-xs flex-col overflow-hidden p-0"
              align={isMobile ? "center" : "start"}
            >
              <ModelSelect
                selectedModelId={chatSettings.model}
                onSelectModel={model => {
                  setChatSettings({ ...chatSettings, model })
                  setIsOpen(false)
                }}
                onClose={() => setIsOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
