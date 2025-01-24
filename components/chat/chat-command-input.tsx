import { PentestGPTContext } from "@/context/context"
import { FC, useContext } from "react"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { FilePicker } from "./file-picker"
import { ToolPicker } from "./tool-picker"
import { useUIContext } from "@/context/ui-context"

interface ChatCommandInputProps {}

export const ChatCommandInput: FC<ChatCommandInputProps> = ({}) => {
  const { newMessageFiles, chatFiles, isPremiumSubscription } =
    useContext(PentestGPTContext)

  const {
    isAtPickerOpen,
    setIsAtPickerOpen,
    atCommand,
    focusFile,
    isToolPickerOpen,
    setIsToolPickerOpen,
    slashCommand,
    focusTool
  } = useUIContext()

  const { handleSelectUserFile, handleSelectTool } = usePromptAndCommand()

  return (
    <>
      <div>
        {isPremiumSubscription && (
          <FilePicker
            isOpen={isAtPickerOpen}
            searchQuery={atCommand}
            onOpenChange={setIsAtPickerOpen}
            selectedFileIds={[...newMessageFiles, ...chatFiles].map(
              file => file.id
            )}
            onSelectFile={handleSelectUserFile}
            isFocused={focusFile}
          />
        )}

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
