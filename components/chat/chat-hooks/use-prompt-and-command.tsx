import { useContext } from "react"
import { PentestGPTContext } from "@/context/context"
import { useUIContext } from "@/context/ui-context"
import { PluginSummary } from "@/types/plugins"

export const usePromptAndCommand = () => {
  const { userInput, setUserInput } = useContext(PentestGPTContext)
  const { setIsToolPickerOpen, setSlashCommand, setSelectedPlugin } =
    useUIContext()

  const handleInputChange = (value: string) => {
    const slashMatch = value.match(/(?:^|\s)\/([^ ]*)$/)

    if (slashMatch) {
      setSlashCommand(slashMatch[1] || "")
      setIsToolPickerOpen(true)
    } else {
      setIsToolPickerOpen(false)
      setSlashCommand("")
    }

    setUserInput(value)
  }

  const handleSelectTool = (tool: PluginSummary) => {
    setIsToolPickerOpen(false)
    setSelectedPlugin(tool.value)
    setUserInput(userInput.replace(/\/[^ ]*$/, ""))
  }

  return {
    handleInputChange,
    handleSelectTool
  }
}
