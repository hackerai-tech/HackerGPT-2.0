import { FC } from "react"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { ToolPicker } from "./tool-picker"
import { useUIContext } from "@/context/ui-context"

interface ChatCommandInputProps {}

export const ChatCommandInput: FC<ChatCommandInputProps> = ({}) => {
  const { isToolPickerOpen, setIsToolPickerOpen, slashCommand, focusTool } =
    useUIContext()

  const { handleSelectTool } = usePromptAndCommand()

  return (
    <>
      <div>
        <ToolPicker
          isOpen={isToolPickerOpen}
          searchQuery={slashCommand}
          onOpenChange={setIsToolPickerOpen}
          onSelectTool={handleSelectTool}
          isFocused={focusTool}
        />
      </div>
    </>
  )
}
