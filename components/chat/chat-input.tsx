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
  IconArrowUp,
  IconLoader2,
  IconMicrophone
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
import useSpeechRecognition from "./chat-hooks/use-speech-recognition"
import VoiceRecordingBar from "@/components/ui/voice-recording-bar"
import VoiceLoadingBar from "@/components/ui/voice-loading-bar"

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
    isMobile,
    isMicSupported
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

  const handleTranscriptChange = (transcript: string) => {
    if (transcript !== userInput) {
      handleInputChange(transcript)
    }
  }

  const {
    isListening,
    setIsListening,
    hasMicAccess,
    startListening,
    cancelListening,
    isSpeechToTextLoading,
    hasSupportedMimeType,
    isRequestingMicAccess,
    requestMicAccess,
    micPermissionDenied
  } = useSpeechRecognition(handleTranscriptChange)

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
                <p className="font-medium">Upload Files</p>
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

        {isEnhancedMenuOpen && !isTemporaryChat && <EnhancedMenuPicker />}
      </div>

      {isListening ? (
        <VoiceRecordingBar
          isListening={isListening}
          stopListening={() => setIsListening(false)}
          cancelListening={() => {
            setIsListening(false)
            cancelListening()
          }}
          isEnhancedMenuOpen={isEnhancedMenuOpen}
        />
      ) : isSpeechToTextLoading ? (
        <VoiceLoadingBar
          isLoading={isSpeechToTextLoading}
          isEnhancedMenuOpen={isEnhancedMenuOpen}
        />
      ) : (
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

          <Input
            ref={fileInputRef}
            className="hidden w-0"
            type="file"
            multiple
            onChange={e => {
              if (!e.target.files) return

              const files = Array.from(e.target.files)

              if (files.length > 4) {
                toast.error("Maximum of 4 files can be uploaded at once.")
                return
              }

              handleFileUpload(
                files,
                setShowConfirmationDialog,
                setPendingFiles,
                handleSelectDeviceFile
              )
            }}
            accept={filesToAccept}
          />

          {isMobile &&
          isPremiumSubscription &&
          optionsCollapsed &&
          !isTemporaryChat ? (
            <div className="absolute bottom-[10px] left-3 flex flex-row">
              <IconCirclePlus
                className="cursor-pointer p-1 hover:opacity-50"
                onClick={() => setOptionsCollapsed(false)}
                size={34}
              />
            </div>
          ) : (
            <div className="absolute bottom-[10px] left-3 flex flex-row">
              <ToolOptions />
            </div>
          )}

          <TextareaAutosize
            textareaRef={chatInputRef}
            className={`ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md bg-secondary flex w-full resize-none rounded-md border-none py-2 ${
              isTemporaryChat
                ? isPremiumSubscription
                  ? "bg-tertiary pl-12" // Temporary chat with premium
                  : "bg-tertiary" // Temporary chat without premium
                : isMobile && isPremiumSubscription && optionsCollapsed
                  ? "pl-12" // Mobile collapsed
                  : isPremiumSubscription
                    ? "pl-[84px]" // Premium expanded
                    : "pl-12" // Free plan (no file upload)
            } ${
              isPremiumSubscription &&
              isMicSupported &&
              hasSupportedMimeType &&
              !userInput &&
              !isGenerating
                ? "pr-20" // More space for mic + send button
                : "pr-14" // Normal space for send button only
            } focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
            placeholder={
              isMobile
                ? `Message` +
                  (!isPremiumSubscription
                    ? " PentestGPT"
                    : `. Type "#" for files.`)
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

          <div className="absolute bottom-[10px] right-3 flex cursor-pointer items-center space-x-3">
            {isPremiumSubscription &&
              isMicSupported &&
              hasSupportedMimeType &&
              !userInput &&
              !isGenerating &&
              !micPermissionDenied && (
                <>
                  {isRequestingMicAccess ? (
                    <IconLoader2
                      className="animate-spin cursor-pointer p-1 hover:opacity-50"
                      size={30}
                    />
                  ) : (
                    <WithTooltip
                      delayDuration={TOOLTIP_DELAY}
                      side="top"
                      display={
                        <div className="flex flex-col">
                          <p className="font-medium">
                            {hasMicAccess
                              ? "Click to record"
                              : "Enable microphone"}
                          </p>
                        </div>
                      }
                      trigger={
                        <IconMicrophone
                          className="cursor-pointer p-1 hover:opacity-50"
                          onClick={async () => {
                            if (hasMicAccess) {
                              startListening()
                            } else {
                              await requestMicAccess()
                            }
                          }}
                          size={30}
                        />
                      }
                    />
                  )}
                </>
              )}
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
      )}
    </>
  )
}
