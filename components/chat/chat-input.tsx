import { PentestGPTContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { PluginID } from "@/types/plugins"
import {
  IconPlayerStopFilled,
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
import { ToolOptions } from "./chat-tools/tool-options"

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

  return (
    <>
      {/* Unsupported files dialog */}
      {showConfirmationDialog && pendingFiles.length > 0 && (
        <UnsupportedFilesDialog
          isOpen={showConfirmationDialog}
          pendingFiles={pendingFiles}
          onCancel={handleCancel}
          onConfirm={handleConversionConfirmation}
        />
      )}

      {/* Files and Enhanced Menu Container */}
      <div
        className={cn(
          "flex flex-col flex-wrap justify-center gap-2",
          isEnhancedMenuOpen &&
            !newMessageFiles.length &&
            !newMessageImages.length
            ? "mb-2"
            : "",
          newMessageFiles.length > 0 || newMessageImages.length > 0
            ? "my-2"
            : ""
        )}
      >
        <ChatFilesDisplay />
        {isEnhancedMenuOpen && !isTemporaryChat && <EnhancedMenuPicker />}
      </div>

      {/* Chat Input Area */}
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
        <div className="relative flex flex-col">
          <div
            className={cn(
              "bg-secondary border-input relative w-full rounded-xl border-2",
              isTemporaryChat
                ? "bg-tertiary border-tertiary"
                : selectedPlugin && selectedPlugin !== PluginID.NONE
                  ? "border-primary"
                  : "border-secondary"
            )}
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

            {/* Upload files */}
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

            <div className="w-full">
              <TextareaAutosize
                textareaRef={chatInputRef}
                className={cn(
                  "ring-offset-background placeholder:text-muted-foreground text-md",
                  "flex w-full resize-none rounded-t-xl bg-transparent",
                  "border-none focus-visible:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "py-3",
                  "px-3"
                )}
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
              />
            </div>

            <div className="relative min-h-[44px] w-full px-2">
              <div className="absolute bottom-[10px] left-2 flex flex-row">
                <ToolOptions
                  fileInputRef={fileInputRef}
                  isTemporaryChat={isTemporaryChat}
                  handleToggleEnhancedMenu={handleToggleEnhancedMenu}
                />
              </div>

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
                              className="cursor-pointer rounded-lg rounded-bl-xl p-1 hover:bg-black/10 focus-visible:outline-black dark:hover:bg-white/10 dark:focus-visible:outline-white"
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
                      if (!userInput) return
                      handleSendMessage(userInput, chatMessages, false)
                    }}
                    size={30}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
