import { PluginID } from "@/types/plugins"
import { Dispatch, SetStateAction, createContext, useContext } from "react"

interface UIContextType {
  // ENHANCE MENU
  isEnhancedMenuOpen: boolean
  setIsEnhancedMenuOpen: Dispatch<SetStateAction<boolean>>
  selectedPluginType: string
  setSelectedPluginType: Dispatch<SetStateAction<string>>
  selectedPlugin: PluginID
  setSelectedPlugin: Dispatch<SetStateAction<PluginID>>

  // CHAT INPUT COMMAND
  slashCommand: string
  setSlashCommand: Dispatch<SetStateAction<string>>
  isAtPickerOpen: boolean
  setIsAtPickerOpen: Dispatch<SetStateAction<boolean>>
  atCommand: string
  setAtCommand: Dispatch<SetStateAction<string>>
  focusFile: boolean
  setFocusFile: Dispatch<SetStateAction<boolean>>

  // UI States
  isMobile: boolean
  isReadyToChat: boolean
  setIsReadyToChat: Dispatch<SetStateAction<boolean>>
  showSidebar: boolean
  setShowSidebar: (value: boolean | ((prevState: boolean) => boolean)) => void
  showTerminalOutput: boolean
  setShowTerminalOutput: (
    value: boolean | ((prevState: boolean) => boolean)
  ) => void

  // Tools UI
  isToolPickerOpen: boolean
  setIsToolPickerOpen: Dispatch<SetStateAction<boolean>>
  focusTool: boolean
  setFocusTool: Dispatch<SetStateAction<boolean>>
  toolInUse: string
  setToolInUse: Dispatch<SetStateAction<string>>

  // Loading States
  isGenerating: boolean
  setIsGenerating: Dispatch<SetStateAction<boolean>>
  firstTokenReceived: boolean
  setFirstTokenReceived: Dispatch<SetStateAction<boolean>>
}

export const UIContext = createContext<UIContextType>({
  // ENHANCE MENU
  isEnhancedMenuOpen: false,
  setIsEnhancedMenuOpen: () => {},
  selectedPluginType: "",
  setSelectedPluginType: () => {},
  selectedPlugin: PluginID.NONE,
  setSelectedPlugin: () => {},

  // CHAT INPUT COMMAND
  slashCommand: "",
  setSlashCommand: () => {},
  isAtPickerOpen: false,
  setIsAtPickerOpen: () => {},
  atCommand: "",
  setAtCommand: () => {},
  focusFile: false,
  setFocusFile: () => {},

  // UI States
  isMobile: false,
  isReadyToChat: false,
  setIsReadyToChat: () => {},
  showSidebar: false,
  setShowSidebar: () => {},
  showTerminalOutput: false,
  setShowTerminalOutput: () => {},

  // Tools UI
  isToolPickerOpen: false,
  setIsToolPickerOpen: () => {},
  focusTool: false,
  setFocusTool: () => {},
  toolInUse: "none",
  setToolInUse: () => {},

  // Loading States
  isGenerating: false,
  setIsGenerating: () => {},
  firstTokenReceived: false,
  setFirstTokenReceived: () => {}
})

export const useUIContext = () => useContext(UIContext)
