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
  isTemporaryChat: boolean
  handleToggleEnhancedMenu: () => void
}

export const ToolOptions = ({
  fileInputRef,
  isTemporaryChat,
  handleToggleEnhancedMenu
}: ToolOptionsProps) => {
  const TOOLTIP_DELAY = 500

  const {
    isPremiumSubscription,
    newMessageFiles,
    chatFiles,
    newMessageImages,
    chatImages
  } = useContext(PentestGPTContext)

  const {
    selectedPlugin,
    isEnhancedMenuOpen,
    setSelectedPlugin,
    setIsEnhancedMenuOpen,
    isMobile
  } = useUIContext()

  const hasFilesAttached =
    newMessageFiles.length > 0 ||
    chatFiles.length > 0 ||
    newMessageImages.length > 0 ||
    chatImages.length > 0

  const handleWebSearchToggle = () => {
    if (hasFilesAttached) return
    setSelectedPlugin(
      selectedPlugin === PluginID.WEB_SEARCH
        ? PluginID.NONE
        : PluginID.WEB_SEARCH
    )
    if (isEnhancedMenuOpen) {
      setIsEnhancedMenuOpen(false)
    }
  }

  const handlePluginsMenuToggle = () => {
    handleToggleEnhancedMenu()
    // Disable web search and reason llm if active
    if (
      selectedPlugin === PluginID.WEB_SEARCH ||
      selectedPlugin === PluginID.REASON_LLM
    ) {
      setSelectedPlugin(PluginID.NONE)
    }
  }

  const handleReasonLLMToggle = () => {
    if (hasFilesAttached) return
    setSelectedPlugin(
      selectedPlugin === PluginID.REASON_LLM
        ? PluginID.NONE
        : PluginID.REASON_LLM
    )
    if (isEnhancedMenuOpen) {
      setIsEnhancedMenuOpen(false)
    }
  }

  const handleFileClick = () => {
    // Deselect plugins when user attempts to upload a file
    if (
      selectedPlugin === PluginID.WEB_SEARCH ||
      selectedPlugin === PluginID.REASON_LLM
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

      {/* Reason LLM Toggle */}
      {isPremiumSubscription && (
        <WithTooltip
          delayDuration={TOOLTIP_DELAY}
          side="top"
          display={
            <div className="flex flex-col">
              <p className="font-medium">Solve reasoning problems</p>
            </div>
          }
          trigger={
            <div
              className={cn(
                "relative flex flex-row items-center rounded-lg transition-colors duration-300",
                selectedPlugin === PluginID.REASON_LLM
                  ? "bg-primary/10"
                  : "hover:bg-black/10 dark:hover:bg-white/10",
                hasFilesAttached && "pointer-events-none opacity-50"
              )}
              onClick={handleReasonLLMToggle}
            >
              <IconAtom
                className={cn(
                  "cursor-pointer rounded-lg rounded-bl-xl p-1 focus-visible:outline-black dark:focus-visible:outline-white",
                  selectedPlugin === PluginID.REASON_LLM
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
                    (selectedPlugin === PluginID.REASON_LLM
                      ? "max-w-[100px] pr-2 opacity-100"
                      : "max-w-0 opacity-0")
                )}
              >
                Think
              </div>
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
                : "hover:bg-black/10 dark:hover:bg-white/10",
              hasFilesAttached && "pointer-events-none opacity-50"
            )}
            onClick={handleWebSearchToggle}
          >
            <IconWorld
              className={cn(
                "cursor-pointer rounded-lg rounded-bl-xl p-1 focus-visible:outline-black dark:focus-visible:outline-white",
                selectedPlugin === PluginID.WEB_SEARCH
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
    </div>
  )
}
