import { PentestGPTContext } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { IconChevronDown, IconRefresh } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { ModelSelect } from "../models/model-select"
import { WithTooltip } from "../ui/with-tooltip"
import { ChatSecondaryButtons } from "./chat-secondary-buttons"

interface ChatSettingsProps {
  isTemporaryChat: boolean
  handleCleanChat?: () => void
}

export const ChatSettings: FC<ChatSettingsProps> = ({
  isTemporaryChat,
  handleCleanChat
}) => {
  const {
    chatSettings,
    setChatSettings,
    isMobile,
    profile,
    isPremiumSubscription
  } = useContext(PentestGPTContext)

  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  if (!chatSettings || !profile) return null

  const fullModel = LLM_LIST.find(llm => llm.modelId === chatSettings.model)

  return (
    <div
      className={`flex items-center ${
        !isMobile && handleCleanChat && "gap-2 pl-2"
      }`}
    >
      {!isMobile && handleCleanChat && (
        <>
          {!isTemporaryChat ? (
            <ChatSecondaryButtons />
          ) : (
            <WithTooltip
              delayDuration={200}
              display="Clean chat"
              trigger={
                <IconRefresh
                  className="cursor-pointer hover:opacity-50"
                  size={24}
                  onClick={handleCleanChat}
                />
              }
              side="bottom"
            />
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
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
