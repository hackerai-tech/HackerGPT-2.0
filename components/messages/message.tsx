import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { PentestGPTContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { ChatMessage, LLMID, MessageImage } from "@/types"
import {
  IconCaretDownFilled,
  IconCaretRightFilled,
  IconFileFilled,
  IconFileTypePdf
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, RefObject, useContext, useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { MessageActions } from "./message-actions"
import MessageDetailedFeedback from "./message-detailed-feedback"
import { MessageQuickFeedback } from "./message-quick-feedback"
import { MessageTypeResolver } from "./message-type-solver"
import useHotkey from "@/lib/hooks/use-hotkey"
import { toast } from "sonner"
import { Fragment } from "@/lib/tools/e2b/fragments/types"
import { MessageFragment } from "./message-fragment"
import { LoadingState } from "./loading-states"
import dynamic from "next/dynamic"
import { useUIContext } from "@/context/ui-context"

const DynamicFilePreview = dynamic(() => import("../ui/file-preview"), {
  ssr: false
})

interface MessageProps {
  chatMessage: ChatMessage
  previousMessage: Tables<"messages"> | undefined
  isEditing: boolean
  isLast: boolean
  onStartEdit: (message: Tables<"messages">) => void
  onCancelEdit: () => void
  onSubmitEdit: (value: string, sequenceNumber: number) => void
  onSendFeedback: (
    feedback: "good" | "bad",
    reason?: string,
    detailedFeedback?: string,
    allowSharing?: boolean,
    allowEmail?: boolean
  ) => void
}

export const Message: FC<MessageProps> = ({
  chatMessage,
  previousMessage,
  isEditing,
  isLast,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onSendFeedback
}) => {
  const {
    chatMessages,
    temporaryChatMessages,
    isTemporaryChat,
    chatImages,
    files
  } = useContext(PentestGPTContext)

  const {
    isGenerating,
    setIsGenerating,
    firstTokenReceived,
    toolInUse,
    isMobile
  } = useUIContext()

  const { message, fileItems, feedback } = chatMessage

  const fragment = (
    message.fragment ? JSON.parse(message.fragment as string) : null
  ) as Fragment | null

  const messagesToDisplay = isTemporaryChat
    ? temporaryChatMessages
    : chatMessages

  const { handleSendMessage } = useChatHandler()

  const messageSizeLimit = Number(
    process.env.NEXT_PUBLIC_MESSAGE_SIZE_LIMIT || 12000
  )

  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const [isHovering, setIsHovering] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message.content)

  const [showImagePreview, setShowImagePreview] = useState(false)
  const [selectedImage, setSelectedImage] = useState<MessageImage | null>(null)

  const [showFileItemPreview, setShowFileItemPreview] = useState(false)
  const [selectedFileItem, setSelectedFileItem] =
    useState<Tables<"file_items"> | null>(null)

  const [viewSources, setViewSources] = useState(false)

  const [quickFeedback, setQuickFeedback] = useState(false)
  const [sendReportQuery, setSendReportQuery] = useState(false)

  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message.content)
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = message.content
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  useHotkey("c", () => {
    if (isLast && message.role === "assistant") {
      handleCopy()
      toast.success("Last response copied to clipboard", {
        duration: 3000
      })
    }
  })

  const handleSendEdit = () => {
    onSubmitEdit(editedMessage, message.sequence_number)
    onCancelEdit()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isEditing && event.key === "Enter" && event.metaKey) {
      handleSendEdit()
    }
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    await handleSendMessage(
      editedMessage ||
        messagesToDisplay[messagesToDisplay.length - 2].message.content,
      messagesToDisplay,
      true
    )
  }

  const handleRegenerateSpecificModel = async (model: string) => {
    setIsGenerating(true)

    await handleSendMessage(
      editedMessage ||
        messagesToDisplay[messagesToDisplay.length - 2].message.content,
      messagesToDisplay,
      true,
      false,
      undefined,
      model as LLMID
    )
  }

  const handleGoodResponse = async () => {
    if (feedback?.feedback !== "good") {
      onSendFeedback("good", "", "", false, false)
    }
  }

  const handleReportModal = async () => {
    setSendReportQuery(false)
    setIsFeedbackDialogOpen(true)
  }

  const handleBadResponseReason = async (reason: string) => {
    if (feedback?.feedback !== "bad" || feedback?.reason !== reason) {
      onSendFeedback("bad", reason, "", false, false)
    }
    setQuickFeedback(false)
    setSendReportQuery(true)
  }

  const handleBadResponse = async () => {
    if (feedback?.feedback !== "bad") {
      onSendFeedback("bad", "", "", false, false)
    }
    setQuickFeedback(true)
  }

  useEffect(() => {
    if (quickFeedback) {
      const feedbackElement = document.querySelector(".quick-feedback")
      if (feedbackElement) {
        feedbackElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [quickFeedback])

  const handleStartEdit = () => {
    onStartEdit(message)
  }

  useEffect(() => {
    setEditedMessage(message.content)

    if (isEditing && editInputRef.current) {
      const input = editInputRef.current
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }, [isEditing])

  return (
    <div
      className={cn("flex w-full justify-center")}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`relative flex w-full flex-col px-4 py-6 sm:max-w-[800px] sm:px-6 md:px-8
        ${isLast ? "mb-8" : ""}`}
      >
        <div className="flex space-x-3">
          <div
            className={`grow ${isMobile && "space-y-3"} min-w-0 ${message.role === "user" ? "flex justify-end" : ""}`}
          >
            {!firstTokenReceived &&
              isGenerating &&
              isLast &&
              message.role === "assistant" && (
                <LoadingState toolInUse={toolInUse} />
              )}

            {isEditing ? (
              <TextareaAutosize
                textareaRef={editInputRef as RefObject<HTMLTextAreaElement>}
                className="text-md"
                value={editedMessage}
                onValueChange={setEditedMessage}
                maxRows={isMobile ? 6 : 12}
              />
            ) : (
              <div>
                <div
                  className={`flex flex-wrap ${message.role === "user" ? "justify-end" : "justify-start"} gap-2`}
                >
                  {message.image_paths.map((path, index) => {
                    const item = chatImages.find(image => image.path === path)
                    const src = path.startsWith("data") ? path : item?.base64
                    if (!src) return null
                    return (
                      <Image
                        key={index}
                        className="mb-2 cursor-pointer rounded hover:opacity-50"
                        src={src}
                        alt="message image"
                        width={400}
                        height={400}
                        onClick={() => {
                          setSelectedImage({
                            messageId: message.id,
                            path,
                            base64: src,
                            url: path.startsWith("data") ? "" : item?.url || "",
                            file: null
                          })

                          setShowImagePreview(true)
                        }}
                        loading="lazy"
                      />
                    )
                  })}
                </div>
                <MessageTypeResolver
                  previousMessage={previousMessage}
                  message={message}
                  messageSizeLimit={messageSizeLimit}
                  isLastMessage={isLast}
                  toolInUse={toolInUse}
                />
              </div>
            )}
          </div>
        </div>

        {fragment && (
          <MessageFragment fragment={fragment} chatMessage={chatMessage} />
        )}

        {fileItems.length > 0 && (
          <div className="my-2 text-lg font-bold">
            {!viewSources ? (
              <div
                className="flex cursor-pointer items-center hover:opacity-50"
                onClick={() => setViewSources(true)}
              >
                View {fileItems.length} Sources{" "}
                <IconCaretRightFilled className="ml-1" />
              </div>
            ) : (
              <>
                <div
                  className="flex cursor-pointer items-center hover:opacity-50"
                  onClick={() => setViewSources(false)}
                >
                  Sources <IconCaretDownFilled className="ml-1" />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {fileItems.map((fileItem, index) => {
                    const parentFile = files.find(
                      file => file.id === fileItem.file_id
                    )

                    return (
                      <div
                        key={index}
                        className="border-primary flex cursor-pointer items-center space-x-4 rounded-xl border px-4 py-3 hover:opacity-50"
                        onClick={() => {
                          setSelectedFileItem(fileItem)
                          setShowFileItemPreview(true)
                        }}
                      >
                        <div className="rounded bg-blue-500 p-2">
                          {(() => {
                            const fileExtension = parentFile?.type.includes("/")
                              ? parentFile.type.split("/")[1]
                              : parentFile?.type

                            switch (fileExtension) {
                              case "pdf":
                                return <IconFileTypePdf />
                              default:
                                return <IconFileFilled />
                            }
                          })()}
                        </div>

                        <div className="w-fit space-y-1 truncate text-wrap text-xs">
                          <div className="truncate">{parentFile?.name}</div>

                          <div className="truncate text-xs opacity-50">
                            {fileItem.content.substring(0, 60)}...
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2"></div>

        {isEditing && (
          <div className="mt-2 flex justify-end space-x-2">
            <Button size="sm" variant="secondary" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSendEdit}>
              Send
            </Button>
          </div>
        )}

        {!quickFeedback && !sendReportQuery && !isEditing && (
          <div
            className={`absolute bottom-1 ${message.role === "user" ? "right-5 sm:right-8" : "left-5 sm:left-8"}`}
          >
            <MessageActions
              onCopy={handleCopy}
              onEdit={handleStartEdit}
              isAssistant={message.role === "assistant"}
              isLast={isLast}
              isEditing={isEditing}
              isHovering={isHovering}
              isGoodResponse={feedback?.feedback === "good"}
              isBadResponse={feedback?.feedback === "bad"}
              messageHasImage={message.image_paths.length > 0}
              onRegenerate={handleRegenerate}
              onRegenerateSpecificModel={handleRegenerateSpecificModel}
              onGoodResponse={handleGoodResponse}
              onBadResponse={handleBadResponse}
              messageContent={message.content || ""}
              messageModel={message.model}
              messageSequenceNumber={message.sequence_number}
            />
          </div>
        )}

        {quickFeedback && (
          <MessageQuickFeedback
            handleBadResponseReason={handleBadResponseReason}
            feedback={feedback}
          />
        )}

        {sendReportQuery && (
          <div className="rounded-lg border p-4 shadow-lg">
            <p className="mb-2">Would you like to tell us more details?</p>
            <div className="flex flex-row flex-wrap items-start gap-2">
              <Button variant="outline" size="sm" onClick={handleReportModal}>
                Yes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSendReportQuery(false)}
              >
                No
              </Button>
            </div>
          </div>
        )}
      </div>

      {showImagePreview && selectedImage && (
        <DynamicFilePreview
          type="image"
          item={selectedImage}
          isOpen={showImagePreview}
          onOpenChange={(isOpen: boolean) => {
            setShowImagePreview(isOpen)
            setSelectedImage(null)
          }}
        />
      )}

      {showFileItemPreview && selectedFileItem && (
        <DynamicFilePreview
          type="file_item"
          item={selectedFileItem}
          isOpen={showFileItemPreview}
          onOpenChange={(isOpen: boolean) => {
            setShowFileItemPreview(isOpen)
            setSelectedFileItem(null)
          }}
        />
      )}

      <MessageDetailedFeedback
        isOpen={isFeedbackDialogOpen}
        onClose={() => setIsFeedbackDialogOpen(false)}
        feedback={feedback as Tables<"feedback">}
        onSendFeedback={onSendFeedback}
      />
    </div>
  )
}
