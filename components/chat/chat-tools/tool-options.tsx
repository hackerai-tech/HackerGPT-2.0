import { PentestGPTContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { PluginID } from "@/types/plugins"
import {
  IconPaperclip,
  IconPuzzle,
  IconPuzzleOff,
  IconWorld
} from "@tabler/icons-react"
import { useContext } from "react"
import { WithTooltip } from "../../ui/with-tooltip"
import { useUIContext } from "@/context/ui-context"

interface ToolOptionsProps {
  fileInputRef: React.RefObject<HTMLInputElement>
  isTemporaryChat: boolean
  handleToggleEnhancedMenu: () => void
}

export const ToolOptions = ({
  fileInputRef,
  isTemporaryChat,
  handleToggleEnhancedMenu
}: ToolOptionsProps) => {
  const TOOLTIP_DELAY = 500

  const { isPremiumSubscription } = useContext(PentestGPTContext)

  const {
    selectedPlugin,
    isEnhancedMenuOpen,
    setSelectedPlugin,
    setIsEnhancedMenuOpen
  } = useUIContext()

  const handleWebSearchToggle = () => {
    if (selectedPlugin === PluginID.WEB_SEARCH) {
      setSelectedPlugin(PluginID.NONE)
    } else {
      setSelectedPlugin(PluginID.WEB_SEARCH)
      // Close enhanced menu if open
      if (isEnhancedMenuOpen) {
        setIsEnhancedMenuOpen(false)
      }
    }
  }

  const handlePluginsMenuToggle = () => {
    handleToggleEnhancedMenu()
    // Disable web search if active
    if (selectedPlugin === PluginID.WEB_SEARCH) {
      setSelectedPlugin(PluginID.NONE)
    }
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
              onClick={() => fileInputRef.current?.click()}
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
      {!isTemporaryChat && (
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
      )}

      {/* Web Search Toggle */}
      <WithTooltip
        delayDuration={TOOLTIP_DELAY}
        side="top"
        display={
          <div className="flex flex-col">
            <p className="font-medium">Search the Web</p>
          </div>
        }
        trigger={
          <div
            className={cn(
              "relative flex flex-row items-center rounded-lg transition-colors duration-300",
              selectedPlugin === PluginID.WEB_SEARCH
                ? "bg-primary/10"
                : "hover:bg-black/10 dark:hover:bg-white/10"
            )}
          >
            <IconWorld
              className={cn(
                "cursor-pointer rounded-lg rounded-bl-xl p-1 focus-visible:outline-black dark:focus-visible:outline-white",
                selectedPlugin === PluginID.WEB_SEARCH
                  ? "text-primary"
                  : "opacity-50"
              )}
              onClick={handleWebSearchToggle}
              size={32}
            />
            {/* Animated Search Text */}
            <div
              className={cn(
                "whitespace-nowrap text-xs font-medium",
                "transition-all duration-300",
                selectedPlugin === PluginID.WEB_SEARCH
                  ? "text-primary max-w-[100px] pr-2 opacity-100"
                  : "max-w-0 opacity-0"
              )}
            >
              Search
            </div>
          </div>
        }
      />
    </div>
  )
}
