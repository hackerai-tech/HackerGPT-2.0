import { PentestGPTContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { PluginID } from "@/types/plugins"
import {
  IconCirclePlus,
  IconPaperclip,
  IconPlayerStopFilled,
  IconPuzzle,
  IconPuzzleOff,
  IconArrowUp
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { ChatCommandInput } from "./chat-command-input"
import { ChatFilesDisplay } from "./chat-files-display"
import { handleFileUpload } from "./chat-helpers/file-upload"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectFileHandler } from "./chat-hooks/use-select-file-handler"
import { EnhancedMenuPicker } from "./enhance-menu"
import { UnsupportedFilesDialog } from "./unsupported-files-dialog"

interface ChatInputProps {
  isTemporaryChat: boolean
}

export const ChatInput: FC<ChatInputProps> = ({ isTemporaryChat }) => {
  const TOOLTIP_DELAY = 1000

  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [showConfirmationDialog, setShowConfirmationDialog] =
    useState<boolean>(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const [optionsCollapsed, setOptionsCollapsed] = useState(false)

  const {
    userInput,
    chatMessages,
    isGenerating,
    focusFile,
    isAtPickerOpen,
    setFocusFile,
    chatSettings,
    newMessageFiles,
    newMessageImages,
    isEnhancedMenuOpen,
    setIsEnhancedMenuOpen,
    selectedPlugin,
    isPremiumSubscription,
    isMobile
  } = useContext(PentestGPTContext)

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  const handleToggleEnhancedMenu = () => {
    setIsEnhancedMenuOpen(!isEnhancedMenuOpen)
  }

  const divRef = useRef<HTMLDivElement>(null)
  const [bottomSpacingPx, setBottomSpacingPx] = useState(20)

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { height } = entry.contentRect
        setBottomSpacingPx(height + 20)
      }
    })

    if (divRef.current) {
      observer.observe(divRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const { handleInputChange } = usePromptAndCommand()

  const { filesToAccept, handleSelectDeviceFile } = useSelectFileHandler()

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      handleFocusChatInput()
    }, 200) // FIX: hacky
  }, [])

  useEffect(() => {
    if (isTyping) {
      setOptionsCollapsed(true)
    }
  }, [isTyping])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    setOptionsCollapsed(true)

    if (!isTyping && event.key === "Enter" && !event.shiftKey && !isMobile) {
      event.preventDefault()
      if (!isGenerating) {
        handleSendMessage(userInput, chatMessages, false, false)
      }
    }

    if (
      isAtPickerOpen &&
      (event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault()
      setFocusFile(!focusFile)
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const imagesAllowed = LLM_LIST.find(
      llm => llm.modelId === chatSettings?.model
    )?.imageInput

    const items = event.clipboardData.items
    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        if (!imagesAllowed) {
          toast.error(`Images are not supported for this model.`)
          return
        }
        const file = item.getAsFile()
        if (!file) return
        handleSelectDeviceFile(file)
      }
    }
  }

  const handleConversionConfirmation = () => {
    pendingFiles.forEach(file => handleSelectDeviceFile(file))
    setShowConfirmationDialog(false)
    setPendingFiles([])
  }

  const handleCancel = () => {
    setPendingFiles([])
    setShowConfirmationDialog(false)
  }

  const ToolOptions = () => (
    <>
      <div
        className="flex flex-row items-center"
        onClick={() => fileInputRef.current?.click()}
      >
        {isPremiumSubscription && (
          <WithTooltip
            delayDuration={TOOLTIP_DELAY}
            side="top"
            display={
              <div className="flex flex-col">
                <p className="font-medium">Upload a File</p>
              </div>
            }
            trigger={
              <IconPaperclip
                className="bottom-[12px] left-3 cursor-pointer p-1 hover:opacity-50"
                size={32}
              />
            }
          />
        )}
      </div>
      {!isTemporaryChat && (
        <div
          className="flex flex-row items-center"
          onClick={handleToggleEnhancedMenu}
        >
          <WithTooltip
            delayDuration={TOOLTIP_DELAY}
            side="top"
            display={
              <div className="flex flex-col">
                <p className="font-medium">Show/Hide Plugins Menu</p>
              </div>
            }
            trigger={
              isEnhancedMenuOpen ? (
                <IconPuzzle
                  className="bottom-[12px] left-12 cursor-pointer p-1 hover:opacity-50"
                  size={32}
                />
              ) : (
                <IconPuzzleOff
                  className="bottom-[12px] left-12 cursor-pointer p-1 opacity-50 hover:opacity-100"
                  size={32}
                />
              )
            }
          />
        </div>
      )}
    </>
  )

  return (
    <>
      {showConfirmationDialog && pendingFiles.length > 0 && (
        <UnsupportedFilesDialog
          isOpen={showConfirmationDialog}
          pendingFiles={pendingFiles}
          onCancel={handleCancel}
          onConfirm={handleConversionConfirmation}
        />
      )}

      <div
        className={`flex flex-col flex-wrap justify-center ${newMessageFiles.length > 0 || newMessageImages.length > 0 ? "my-2" : ""} gap-2`}
      >
        <ChatFilesDisplay />

        {isEnhancedMenuOpen && <EnhancedMenuPicker />}
      </div>

      <div
        className={`bg-secondary border-input relative flex min-h-[56px] w-full items-center justify-center rounded-xl border-2 ${
          isTemporaryChat
            ? "bg-tertiary border-tertiary"
            : selectedPlugin && selectedPlugin !== PluginID.NONE
              ? "border-primary"
              : "border-secondary"
        } ${isEnhancedMenuOpen ? "mt-3" : ""}`}
        ref={divRef}
      >
        {isPremiumSubscription && (
          <div
            className={`absolute left-0 w-full overflow-auto rounded-xl dark:border-none`}
            style={{ bottom: `${bottomSpacingPx}px` }}
          >
            <ChatCommandInput />
          </div>
        )}

        <div className="ml-3 flex flex-row">
          <Input
            ref={fileInputRef}
            className="hidden w-0"
            type="file"
            onChange={e => {
              if (!e.target.files) return
              handleFileUpload(
                Array.from(e.target.files),
                chatSettings,
                setShowConfirmationDialog,
                setPendingFiles,
                handleSelectDeviceFile
              )
            }}
            accept={filesToAccept}
          />

          {isMobile && isPremiumSubscription && optionsCollapsed ? (
            <div className="flex flex-row items-center">
              <IconCirclePlus
                className="cursor-pointer p-1 hover:opacity-50"
                onClick={() => setOptionsCollapsed(false)}
                size={34}
              />
            </div>
          ) : (
            <ToolOptions />
          )}
        </div>

        <TextareaAutosize
          textareaRef={chatInputRef}
          className={`ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md bg-secondary flex w-full resize-none rounded-md border-none py-2 pl-2 pr-14 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            isTemporaryChat ? "bg-tertiary" : ""
          }`}
          placeholder={
            isMobile
              ? `Message` +
                (!isPremiumSubscription ? "" : `. Type "#" for files.`)
              : `Message PentestGPT` +
                (!isPremiumSubscription ? "" : `. Type "#" for files.`)
          }
          onValueChange={handleInputChange} // This function updates the userInput state
          value={userInput} // This state should display the transcribed text
          minRows={1}
          maxRows={isMobile ? 6 : 12}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
          onClick={() => setOptionsCollapsed(true)}
        />

        <div className="absolute bottom-[10px] right-3 flex cursor-pointer items-center space-x-2">
          {isGenerating ? (
            <IconPlayerStopFilled
              className={cn(
                "md:hover:bg-background animate-pulse rounded bg-transparent p-1 md:hover:opacity-50"
              )}
              onClick={handleStopMessage}
              size={30}
            />
          ) : (
            <IconArrowUp
              className={cn(
                "bg-primary text-secondary rounded p-1 hover:opacity-50",
                !userInput && "cursor-not-allowed opacity-50"
              )}
              stroke={2.5}
              onClick={() => {
                if (isTyping) setOptionsCollapsed(true)
                if (!userInput) return
                handleSendMessage(userInput, chatMessages, false)
              }}
              size={30}
            />
          )}
        </div>
      </div>
    </>
  )
}
