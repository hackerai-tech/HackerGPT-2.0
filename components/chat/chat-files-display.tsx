import { PentestGPTContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { ChatFile, MessageImage } from "@/types"
import {
  IconCircleFilled,
  IconFileFilled,
  IconFileTypeCsv,
  IconFileTypeDocx,
  IconFileTypePdf,
  IconFileTypeTxt,
  IconJson,
  IconLoader2,
  IconMarkdown,
  IconX
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useState } from "react"
import { Button } from "../ui/button"
import { WithTooltip } from "../ui/with-tooltip"
import { ChatRetrievalSettings } from "./chat-retrieval-settings"
import { dragHelper } from "@/components/chat/chat-helpers/drag"
import dynamic from "next/dynamic"
import { useUIContext } from "@/context/ui-context"

const DynamicFilePreview = dynamic(() => import("../ui/file-preview"), {
  ssr: false
})

export const ChatFilesDisplay: FC = () => {
  const {
    newMessageImages,
    setNewMessageImages,
    newMessageFiles,
    setNewMessageFiles,
    setShowFilesDisplay,
    showFilesDisplay,
    chatFiles,
    chatImages,
    setChatImages,
    setChatFiles,
    setUseRetrieval
  } = useContext(PentestGPTContext)

  const { isMobile } = useUIContext()

  const [selectedFile, setSelectedFile] = useState<ChatFile | null>(null)
  const [selectedImage, setSelectedImage] = useState<MessageImage | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [isHovering, setIsHovering] = useState(false)

  const messageImages = [
    ...newMessageImages.filter(
      image =>
        !chatImages.some(chatImage => chatImage.messageId === image.messageId)
    )
  ]

  const combinedChatFiles = [
    ...newMessageFiles.filter(
      file => !chatFiles.some(chatFile => chatFile.id === file.id)
    ),
    ...chatFiles
  ]

  const onlyImages = messageImages.length > 0 && combinedChatFiles.length == 0

  const combinedMessageFiles = [...messageImages, ...combinedChatFiles]

  return onlyImages || (showFilesDisplay && combinedMessageFiles.length > 0) ? (
    <div className="w-full">
      {showPreview && selectedImage && (
        <DynamicFilePreview
          type="image"
          item={selectedImage}
          isOpen={showPreview}
          onOpenChange={(isOpen: boolean) => {
            setShowPreview(isOpen)
            setSelectedImage(null)
          }}
        />
      )}

      {showPreview && selectedFile && (
        <DynamicFilePreview
          type="file"
          item={selectedFile}
          isOpen={showPreview}
          onOpenChange={(isOpen: boolean) => {
            setShowPreview(isOpen)
            setSelectedFile(null)
          }}
        />
      )}

      <div className="flex w-full justify-center">
        <div className="w-full max-w-[800px]">
          {!onlyImages && (
            <div className="flex w-full items-center justify-center">
              <div className="relative flex items-center">
                <Button
                  className="flex h-[32px] w-[140px] items-center space-x-2 pr-10"
                  onClick={() => setShowFilesDisplay(false)}
                  variant="secondary"
                >
                  <RetrievalToggle />
                  <span>Hide files</span>
                </Button>

                <div className="absolute right-1">
                  <ChatRetrievalSettings />
                </div>
              </div>
            </div>
          )}

          <div className="overflow-auto">
            <div
              className="scrollbar-hide sm:scrollbar-show flex w-[calc(100vw-2rem)] gap-2 overflow-x-auto pt-2 sm:w-full sm:max-w-[800px]"
              onMouseDown={dragHelper}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              {messageImages.map((image, index) => (
                <div
                  key={index}
                  className="relative flex h-[64px] cursor-pointer items-center space-x-4 rounded-xl hover:opacity-50"
                >
                  <Image
                    className="rounded"
                    // Force the image to be 56px by 56px
                    style={{
                      minWidth: "56px",
                      minHeight: "56px",
                      maxHeight: "56px",
                      maxWidth: "56px"
                    }}
                    src={image.base64} // Preview images will always be base64
                    alt="File image"
                    width={56}
                    height={56}
                    onClick={() => {
                      setSelectedImage(image)
                      setShowPreview(true)
                    }}
                  />

                  {(isMobile || isHovering) && (
                    <WithTooltip
                      delayDuration={0}
                      side="top"
                      display={<div>Remove image</div>}
                      trigger={
                        <IconX
                          className="bg-secondary border-primary absolute right-[-6px] top-[-2px] flex size-5 cursor-pointer items-center justify-center rounded-full border text-[10px] hover:border-red-500 hover:bg-white hover:text-red-500"
                          onClick={e => {
                            e.stopPropagation()
                            setNewMessageImages(
                              newMessageImages.filter(
                                f => f.messageId !== image.messageId
                              )
                            )
                            setChatImages(
                              chatImages.filter(
                                f => f.messageId !== image.messageId
                              )
                            )

                            // Check if this is the last file/image and reset showFilesDisplay
                            const remainingImages =
                              newMessageImages.length + chatImages.length - 1
                            const remainingFiles = combinedChatFiles.length
                            if (remainingImages + remainingFiles === 0) {
                              setShowFilesDisplay(false)
                            }
                          }}
                        />
                      }
                    />
                  )}
                </div>
              ))}

              {combinedChatFiles.map((file, index) =>
                file.id.startsWith("loading") ? (
                  <div
                    key={index}
                    className="bg-secondary relative flex h-[64px] items-center space-x-4 rounded-xl px-4 py-3"
                  >
                    <div className="rounded bg-blue-500 p-2">
                      <IconLoader2 className="animate-spin" />
                    </div>

                    <div className="truncate text-sm">
                      <div className="truncate">{file.name}</div>
                      <div className="truncate opacity-50">{file.type}</div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={file.id}
                    className="bg-secondary relative flex h-[64px] cursor-pointer items-center space-x-4 rounded-xl px-4 py-3 hover:opacity-50"
                  >
                    <div className="rounded bg-blue-500 p-2">
                      {(() => {
                        const fileExtension = file.type?.includes("/")
                          ? file.type.split("/")[1]
                          : file.type

                        switch (fileExtension) {
                          case "pdf":
                            return <IconFileTypePdf />
                          case "markdown":
                            return <IconMarkdown />
                          case "txt":
                            return <IconFileTypeTxt />
                          case "json":
                            return <IconJson />
                          case "csv":
                            return <IconFileTypeCsv />
                          case "docx":
                            return <IconFileTypeDocx />
                          default:
                            return <IconFileFilled />
                        }
                      })()}
                    </div>

                    <div className="truncate text-sm">
                      <div className="truncate">{file.name}</div>
                    </div>

                    {(isMobile || isHovering) && (
                      <WithTooltip
                        delayDuration={0}
                        side="top"
                        display={<div>Remove file</div>}
                        trigger={
                          <IconX
                            className="bg-secondary border-primary absolute right-[-6px] top-[-6px] flex size-5 cursor-pointer items-center justify-center rounded-full border text-[10px] hover:border-red-500 hover:bg-white hover:text-red-500"
                            onClick={e => {
                              e.stopPropagation()
                              if (combinedChatFiles.length === 1) {
                                setUseRetrieval(false)
                              }
                              setNewMessageFiles(
                                newMessageFiles.filter(f => f.id !== file.id)
                              )
                              setChatFiles(
                                chatFiles.filter(f => f.id !== file.id)
                              )

                              // Check if this is the last file/image and reset showFilesDisplay
                              const remainingFiles =
                                combinedChatFiles.length - 1
                              const remainingImages = messageImages.length
                              if (remainingFiles + remainingImages === 0) {
                                setShowFilesDisplay(false)
                              }
                            }}
                          />
                        }
                      />
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    combinedMessageFiles.length > 0 && (
      <div className="flex w-full items-center justify-center">
        <div className="relative flex items-center">
          <Button
            className="flex h-[32px] w-[140px] items-center space-x-2 pr-12"
            onClick={() => setShowFilesDisplay(true)}
            variant="secondary"
          >
            <RetrievalToggle />
            <span>
              View {combinedMessageFiles.length} file
              {combinedMessageFiles.length > 1 ? "s" : ""}
            </span>
          </Button>

          <div className="absolute right-1">
            <ChatRetrievalSettings />
          </div>
        </div>
      </div>
    )
  )
}

const RetrievalToggle = ({}) => {
  const { useRetrieval, setUseRetrieval } = useContext(PentestGPTContext)

  return (
    <div className="flex items-center">
      <WithTooltip
        delayDuration={0}
        side="top"
        display={
          <div>
            {useRetrieval
              ? "File retrieval is enabled on the selected files for this message. Click the indicator to disable."
              : "Click the indicator to enable file retrieval for this message."}
          </div>
        }
        trigger={
          <IconCircleFilled
            className={cn(
              "p-1",
              useRetrieval ? "text-green-500" : "text-red-500",
              useRetrieval ? "hover:text-green-200" : "hover:text-red-200"
            )}
            size={24}
            onClick={e => {
              e.stopPropagation()
              setUseRetrieval(prev => !prev)
            }}
          />
        }
      />
    </div>
  )
}
