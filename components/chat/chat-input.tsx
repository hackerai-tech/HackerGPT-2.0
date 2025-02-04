import { PentestGPTContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { PluginID } from "@/types/plugins"
import { FC, RefObject, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
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
import { useUIContext } from "@/context/ui-context"
import { useKeyboardHandler } from "./chat-hooks/use-key-handler"
import { ChatSendButton } from "./chat-send-button"
import { useMessageHandler } from "./chat-hooks/use-message-handler"
import { ChatMicButton } from "./chat-mic-button"

export const ChatInput: FC = () => {
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [showConfirmationDialog, setShowConfirmationDialog] =
    useState<boolean>(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [bottomSpacingPx, setBottomSpacingPx] = useState(5)

  const divRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    userInput,
    chatMessages,
    newMessageFiles,
    newMessageImages,
    isPremiumSubscription,
    isMicSupported,
    isTemporaryChat
  } = useContext(PentestGPTContext)

  const {
    isGenerating,
    isEnhancedMenuOpen,
    setIsEnhancedMenuOpen,
    selectedPlugin,
    isMobile
  } = useUIContext()

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  const { handleInputChange } = usePromptAndCommand()

  const { handleSelectDeviceFile } = useSelectFileHandler()

  const { sendMessage, stopMessage, canSend } = useMessageHandler({
    isGenerating: isGenerating,
    userInput: userInput,
    chatMessages: chatMessages,
    handleSendMessage: handleSendMessage,
    handleStopMessage: handleStopMessage
  })

  const { handleKeyDown, handlePaste } = useKeyboardHandler({
    isTyping: isTyping,
    isMobile: isMobile,
    sendMessage: sendMessage,
    handleSelectDeviceFile: handleSelectDeviceFile
  })

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

  // Effect for bottom spacing
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setBottomSpacingPx(entry.contentRect.height + 10)
      }
    })

    if (divRef.current) {
      observer.observe(divRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Effect for initial focus
  useEffect(() => {
    setTimeout(() => {
      handleFocusChatInput()
    }, 200) // FIX: hacky
  }, [])

  return (
    <>
      {/* Unsupported files dialog */}
      {showConfirmationDialog && pendingFiles.length > 0 && (
        <UnsupportedFilesDialog
          isOpen={showConfirmationDialog}
          pendingFiles={pendingFiles}
          onCancel={() => {
            setPendingFiles([])
            setShowConfirmationDialog(false)
          }}
          onConfirm={() => {
            pendingFiles.forEach(handleSelectDeviceFile)
            setShowConfirmationDialog(false)
            setPendingFiles([])
          }}
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
        {isEnhancedMenuOpen && <EnhancedMenuPicker />}
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
              "bg-secondary border-secondary relative w-full rounded-xl border-2",
              isTemporaryChat && "bg-tertiary border-tertiary",
              selectedPlugin &&
                selectedPlugin !== PluginID.NONE &&
                "border-primary"
            )}
            ref={divRef}
          >
            <div
              className={`absolute left-0 w-full overflow-auto rounded-xl dark:border-none`}
              style={{ bottom: `${bottomSpacingPx}px` }}
            >
              <ChatCommandInput />
            </div>

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
              accept="*"
            />

            <div className="w-full">
              <TextareaAutosize
                textareaRef={chatInputRef as RefObject<HTMLTextAreaElement>}
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
                  fileInputRef={fileInputRef as RefObject<HTMLInputElement>}
                  handleToggleEnhancedMenu={() =>
                    setIsEnhancedMenuOpen(!isEnhancedMenuOpen)
                  }
                />
              </div>

              <div className="absolute bottom-[10px] right-3 flex cursor-pointer items-center space-x-3">
                {/* Mic button */}
                <ChatMicButton
                  isPremiumSubscription={isPremiumSubscription}
                  isMicSupported={isMicSupported}
                  hasSupportedMimeType={hasSupportedMimeType}
                  userInput={userInput}
                  isGenerating={isGenerating}
                  micPermissionDenied={micPermissionDenied}
                  isRequestingMicAccess={isRequestingMicAccess}
                  hasMicAccess={hasMicAccess}
                  startListening={startListening}
                  requestMicAccess={requestMicAccess}
                />
                {/* Send button */}
                <ChatSendButton
                  isGenerating={isGenerating}
                  canSend={canSend}
                  onSend={sendMessage}
                  onStop={stopMessage}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
