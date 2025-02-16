import { PentestGPTContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { PluginID } from "@/types/plugins"
import {
  IconPaperclip,
  IconPuzzle,
  IconPuzzleOff,
  IconWorld,
  IconAtom
} from "@tabler/icons-react"
import { useContext } from "react"
import { WithTooltip } from "../../ui/with-tooltip"
import { useUIContext } from "@/context/ui-context"

interface ToolOptionsProps {
  fileInputRef: React.RefObject<HTMLInputElement>
  handleToggleEnhancedMenu: () => void
}

export const ToolOptions = ({
  fileInputRef,
  handleToggleEnhancedMenu
}: ToolOptionsProps) => {
  const TOOLTIP_DELAY = 500

  const { isPremiumSubscription, newMessageImages } =
    useContext(PentestGPTContext)

  const {
    selectedPlugin,
    isEnhancedMenuOpen,
    setSelectedPlugin,
    setIsEnhancedMenuOpen,
    isMobile
  } = useUIContext()

  const hasImageAttached = newMessageImages.length > 0

  const handleWebSearchToggle = () => {
    if (hasImageAttached) return

    if (selectedPlugin === PluginID.REASONING) {
      // If reason LLM is active, clicking web search will enable combined mode
      setSelectedPlugin(PluginID.REASONING_WEB_SEARCH)
    } else if (selectedPlugin === PluginID.REASONING_WEB_SEARCH) {
      // If in combined mode, keep reason LLM active
      setSelectedPlugin(PluginID.REASONING)
    } else {
      // Normal web search toggle behavior
      setSelectedPlugin(
        selectedPlugin === PluginID.WEB_SEARCH
          ? PluginID.NONE
          : PluginID.WEB_SEARCH
      )
    }

    if (isEnhancedMenuOpen) {
      setIsEnhancedMenuOpen(false)
    }
  }

  const handlePluginsMenuToggle = () => {
    handleToggleEnhancedMenu()
    // Disable web search and reason llm if active
    if (
      selectedPlugin === PluginID.WEB_SEARCH ||
      selectedPlugin === PluginID.REASONING
    ) {
      setSelectedPlugin(PluginID.NONE)
    }
  }

  const handleReasonLLMToggle = () => {
    if (hasImageAttached) return

    if (selectedPlugin === PluginID.WEB_SEARCH) {
      // If web search is active, clicking reason LLM will enable combined mode
      setSelectedPlugin(PluginID.REASONING_WEB_SEARCH)
    } else if (selectedPlugin === PluginID.REASONING_WEB_SEARCH) {
      // If in combined mode, keep web search active
      setSelectedPlugin(PluginID.WEB_SEARCH)
    } else {
      // Normal reason LLM toggle behavior
      setSelectedPlugin(
        selectedPlugin === PluginID.REASONING
          ? PluginID.NONE
          : PluginID.REASONING
      )
    }

    if (isEnhancedMenuOpen) {
      setIsEnhancedMenuOpen(false)
    }
  }

  const handleFileClick = () => {
    // Deselect plugins when user attempts to upload a file
    if (
      selectedPlugin === PluginID.WEB_SEARCH ||
      selectedPlugin === PluginID.REASONING
    ) {
      setSelectedPlugin(PluginID.NONE)
    }
    fileInputRef.current?.click()
  }

  return (
    <div className="flex space-x-1">
      {/* File Upload Button */}
      {isPremiumSubscription && (
        <WithTooltip
          delayDuration={TOOLTIP_DELAY}
          side="top"
          display={
            <div className="flex flex-col">
              <p className="font-medium">Upload Files</p>
            </div>
          }
          trigger={
            <div
              className="flex flex-row items-center"
              onClick={handleFileClick}
            >
              <IconPaperclip
                className="cursor-pointer rounded-lg rounded-bl-xl p-1 hover:bg-black/10 focus-visible:outline-black dark:hover:bg-white/10 dark:focus-visible:outline-white"
                size={32}
              />
            </div>
          }
        />
      )}

      {/* Plugins Menu Toggle */}
      <WithTooltip
        delayDuration={TOOLTIP_DELAY}
        side="top"
        display={
          <div className="flex flex-col">
            <p className="font-medium">Show/Hide Plugins Menu</p>
          </div>
        }
        trigger={
          <div
            className="flex flex-row items-center"
            onClick={handlePluginsMenuToggle}
          >
            {isEnhancedMenuOpen ? (
              <IconPuzzle
                className="cursor-pointer rounded-lg rounded-bl-xl p-1 hover:bg-black/10 focus-visible:outline-black dark:hover:bg-white/10 dark:focus-visible:outline-white"
                size={32}
              />
            ) : (
              <IconPuzzleOff
                className="cursor-pointer rounded-lg rounded-bl-xl p-1 opacity-50 hover:bg-black/10 focus-visible:outline-black dark:hover:bg-white/10 dark:focus-visible:outline-white"
                size={32}
              />
            )}
          </div>
        }
      />

      {/* Web Search Toggle */}
      <WithTooltip
        delayDuration={TOOLTIP_DELAY}
        side="top"
        display={
          selectedPlugin !== PluginID.WEB_SEARCH &&
          selectedPlugin !== PluginID.REASONING_WEB_SEARCH && (
            <div className="flex flex-col">
              <p className="font-medium">Search the web</p>
            </div>
          )
        }
        trigger={
          <div
            className={cn(
              "relative flex flex-row items-center rounded-lg transition-colors duration-300",
              selectedPlugin === PluginID.WEB_SEARCH ||
                selectedPlugin === PluginID.REASONING_WEB_SEARCH
                ? "bg-primary/10"
                : "hover:bg-black/10 dark:hover:bg-white/10",
              hasImageAttached && "pointer-events-none opacity-50"
            )}
            onClick={handleWebSearchToggle}
          >
            <IconWorld
              className={cn(
                "cursor-pointer rounded-lg rounded-bl-xl p-1 focus-visible:outline-black dark:focus-visible:outline-white",
                selectedPlugin === PluginID.WEB_SEARCH ||
                  selectedPlugin === PluginID.REASONING_WEB_SEARCH
                  ? "text-primary"
                  : "opacity-50"
              )}
              size={32}
            />
            <div
              className={cn(
                "whitespace-nowrap text-xs font-medium",
                "transition-all duration-300",
                !isMobile && "max-w-[100px] pr-2",
                isMobile &&
                  (selectedPlugin === PluginID.WEB_SEARCH
                    ? "max-w-[100px] pr-2 opacity-100"
                    : "max-w-0 opacity-0")
              )}
            >
              Search
            </div>
          </div>
        }
      />

      {/* Reason LLM Toggle */}
      <WithTooltip
        delayDuration={TOOLTIP_DELAY}
        side="top"
        display={
          selectedPlugin !== PluginID.REASONING &&
          selectedPlugin !== PluginID.REASONING_WEB_SEARCH && (
            <div className="flex flex-col">
              <p className="font-medium">Think before responding</p>
            </div>
          )
        }
        trigger={
          <div
            className={cn(
              "relative flex flex-row items-center rounded-lg transition-colors duration-300",
              selectedPlugin === PluginID.REASONING ||
                selectedPlugin === PluginID.REASONING_WEB_SEARCH
                ? "bg-primary/10"
                : "hover:bg-black/10 dark:hover:bg-white/10",
              hasImageAttached && "pointer-events-none opacity-50"
            )}
            onClick={handleReasonLLMToggle}
          >
            <IconAtom
              className={cn(
                "cursor-pointer rounded-lg rounded-bl-xl p-1 focus-visible:outline-black dark:focus-visible:outline-white",
                selectedPlugin === PluginID.REASONING ||
                  selectedPlugin === PluginID.REASONING_WEB_SEARCH
                  ? "text-primary"
                  : "opacity-50"
              )}
              size={32}
            />
            <div
              className={cn(
                "whitespace-nowrap text-xs font-medium",
                "transition-all duration-300",
                !isMobile && "max-w-[100px] pr-2",
                isMobile &&
                  (selectedPlugin === PluginID.REASONING
                    ? "max-w-[100px] pr-2 opacity-100"
                    : "max-w-0 opacity-0")
              )}
            >
              Reason
            </div>
          </div>
        }
      />
    </div>
  )
}
