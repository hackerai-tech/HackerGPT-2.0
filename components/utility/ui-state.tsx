"use client"

import { UIContext } from "@/context/ui-context"
import { PluginID } from "@/types/plugins"
import { FC, useEffect, useState } from "react"
import { useLocalStorageState } from "@/lib/hooks/use-local-storage-state"

interface UIStateProps {
  children: React.ReactNode
}

export const UIState: FC<UIStateProps> = ({ children }) => {
  // ENHANCE MENU
  const [isEnhancedMenuOpen, setIsEnhancedMenuOpen] = useLocalStorageState(
    "isEnhancedMenuOpen",
    true
  )
  const [selectedPluginType, setSelectedPluginType] = useState("")
  const [selectedPlugin, setSelectedPlugin] = useState(PluginID.NONE)

  // CHAT INPUT COMMAND
  const [slashCommand, setSlashCommand] = useState("")
  const [isAtPickerOpen, setIsAtPickerOpen] = useState(false)
  const [atCommand, setAtCommand] = useState("")
  const [focusFile, setFocusFile] = useState(false)

  // UI States
  const [isMobile, setIsMobile] = useState(false)
  const [isReadyToChat, setIsReadyToChat] = useState(true)
  const [showSidebar, setShowSidebar] = useLocalStorageState(
    "showSidebar",
    false
  )
  const [showTerminalOutput, setShowTerminalOutput] = useLocalStorageState(
    "showTerminalOutput",
    true
  )

  // Tools UI
  const [isToolPickerOpen, setIsToolPickerOpen] = useState(false)
  const [focusTool, setFocusTool] = useState(false)
  const [toolInUse, setToolInUse] = useState("none")

  // Loading States
  const [isGenerating, setIsGenerating] = useState(false)
  const [firstTokenReceived, setFirstTokenReceived] = useState(false)

  // Handle window resize to update isMobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640)
    }

    // Set initial value
    setIsMobile(window.innerWidth <= 640)

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <UIContext.Provider
      value={{
        // ENHANCE MENU
        isEnhancedMenuOpen,
        setIsEnhancedMenuOpen,
        selectedPluginType,
        setSelectedPluginType,
        selectedPlugin,
        setSelectedPlugin,

        // CHAT INPUT COMMAND
        slashCommand,
        setSlashCommand,
        isAtPickerOpen,
        setIsAtPickerOpen,
        atCommand,
        setAtCommand,
        focusFile,
        setFocusFile,

        // UI States
        isMobile,
        isReadyToChat,
        setIsReadyToChat,
        showSidebar,
        setShowSidebar,
        showTerminalOutput,
        setShowTerminalOutput,

        // Tools UI
        isToolPickerOpen,
        setIsToolPickerOpen,
        focusTool,
        setFocusTool,
        toolInUse,
        setToolInUse,

        // Loading States
        isGenerating,
        setIsGenerating,
        firstTokenReceived,
        setFirstTokenReceived
      }}
    >
      {children}
    </UIContext.Provider>
  )
}
