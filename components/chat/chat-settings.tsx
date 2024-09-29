import { PentestGPTContext } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { IconChevronDown } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { ModelSelect } from "../models/model-select"

interface ChatSettingsProps {}

export const ChatSettings: FC<ChatSettingsProps> = ({}) => {
  const {
    chatSettings,
    setChatSettings,
    isMobile,
    profile,
    isPremiumSubscription
  } = useContext(PentestGPTContext)

  const [isOpen, setIsOpen] = useState(false)

  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!chatSettings) return

    setChatSettings({
      ...chatSettings
    })
  }, [chatSettings?.model])

  if (!chatSettings || !profile) return null

  const fullModel = LLM_LIST.find(llm => llm.modelId === chatSettings.model)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button
          ref={buttonRef}
          className={`flex items-center space-x-1 ${isOpen ? "bg-accent" : ""}`}
          variant="ghost"
        >
          <div className="text-xl">
            {!isPremiumSubscription
              ? "PentestGPT"
              : fullModel?.modelName || chatSettings.model}
          </div>

          <IconChevronDown className="ml-1 mt-1" size={18} />
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
  )
}
