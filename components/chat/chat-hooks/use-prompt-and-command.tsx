import { PentestGPTContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { PluginSummary } from "@/types/plugins"
import { useContext } from "react"

export const usePromptAndCommand = () => {
  const {
    setNewMessageFiles,
    userInput,
    setUserInput,
    setShowFilesDisplay,
    setIsAtPickerOpen,
    setSlashCommand,
    setAtCommand,
    setUseRetrieval,
    setIsToolPickerOpen,
    setSelectedPlugin
  } = useContext(PentestGPTContext)

  const handleInputChange = (value: string) => {
    const slashMatch = value.match(/(?:^|\s)\/([^ ]*)$/)
    const atMatch = value.match(/(?:^|\s)#([^ ]*)$/)

    if (slashMatch) {
      setSlashCommand(slashMatch[1] || "")
      setIsToolPickerOpen(true)
    } else if (atMatch) {
      setIsAtPickerOpen(true)
      setAtCommand(atMatch[1])
    } else {
      setIsAtPickerOpen(false)
      setIsToolPickerOpen(false)
      setSlashCommand("")
      setAtCommand("")
    }

    setUserInput(value)
  }

  const handleSelectUserFile = async (file: Tables<"files">) => {
    setShowFilesDisplay(true)
    setIsAtPickerOpen(false)
    setUseRetrieval(true)

    setNewMessageFiles(prev => {
      const fileExists = prev.some(prevFile => prevFile.id === file.id)
      if (!fileExists) {
        return [
          ...prev,
          { id: file.id, name: file.name, type: file.type, file: null }
        ]
      }
      return prev
    })

    setUserInput(userInput.replace(/#[^ ]*$/, ""))
  }

  const handleSelectTool = (tool: PluginSummary) => {
    setIsToolPickerOpen(false)
    setSelectedPlugin(tool.value)
    setUserInput(userInput.replace(/\/[^ ]*$/, ""))
  }

  return {
    handleInputChange,
    handleSelectUserFile,
    handleSelectTool
  }
}
