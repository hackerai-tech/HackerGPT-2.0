import { PentestGPTContext } from "@/context/context"
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconLoader,
  IconPlayerStop,
  IconRepeat,
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled,
  IconVolume
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useState } from "react"
import { WithTooltip } from "../ui/with-tooltip"
import { SwitchModel } from "../ui/switch-model"
import { useAudioPlayer } from "../chat/chat-hooks/use-audio-player"
import { useUIContext } from "@/context/ui-context"

export const MESSAGE_ICON_SIZE = 20

interface MessageActionsProps {
  isAssistant: boolean
  isLast: boolean
  isEditing: boolean
  isHovering: boolean
  isGoodResponse: boolean
  isBadResponse: boolean
  onCopy: () => void
  onEdit: () => void
  onRegenerate: () => void
  onRegenerateSpecificModel: (model: string) => void
  onGoodResponse: () => void
  onBadResponse: () => void
  messageHasImage: boolean
  messageContent: string
  messageModel: string
  messageSequenceNumber: number
}

export const MessageActions: FC<MessageActionsProps> = ({
  isAssistant,
  isLast,
  isEditing,
  isHovering,
  isGoodResponse,
  isBadResponse,
  onCopy,
  onEdit,
  onRegenerate,
  onRegenerateSpecificModel,
  onGoodResponse,
  onBadResponse,
  messageHasImage,
  messageContent,
  messageModel,
  messageSequenceNumber
}) => {
  const {
    currentPlayingMessageId,
    setCurrentPlayingMessageId,
    selectedChat,
    isPremiumSubscription,
    isTemporaryChat
  } = useContext(PentestGPTContext)

  const { isMobile, isGenerating } = useUIContext()

  const { playAudio, stopAudio, isLoading, isPlaying } = useAudioPlayer()
  const [showCheckmark, setShowCheckmark] = useState(false)

  const MESSAGE_ICON_SIZE = isMobile ? 22 : 20
  const isMessageLengthValid =
    messageContent.length > 0 && messageContent.length < 4096
  const isMessageLengthTooShort = messageContent.length === 0

  useEffect(() => {
    if (showCheckmark) {
      const timer = setTimeout(() => {
        setShowCheckmark(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [showCheckmark])

  const handleCopy = () => {
    onCopy()
    setShowCheckmark(true)
  }

  const handlePlayClick = async () => {
    try {
      if (currentPlayingMessageId === messageSequenceNumber.toString()) {
        stopAudio()
        setCurrentPlayingMessageId(null)
      } else {
        await playAudio(messageContent)
        setCurrentPlayingMessageId(messageSequenceNumber.toString())
      }
    } catch (error) {
      console.error("Error playing audio:", error)
    }
  }

  useEffect(() => {
    if (currentPlayingMessageId && selectedChat) {
      stopAudio()
      setCurrentPlayingMessageId(null)
    }
  }, [selectedChat])

  useEffect(() => {
    return () => {
      stopAudio()
      setCurrentPlayingMessageId(null)
    }
  }, [])

  return (isLast && isGenerating) || isEditing ? null : (
    <div className={`text-muted-foreground flex items-center space-x-4`}>
      {/* Temporary chat doesn't have edit functionality */}
      {(isHovering || isLast) &&
        !isAssistant &&
        !messageHasImage &&
        !isTemporaryChat && (
          <WithTooltip
            delayDuration={0}
            side="bottomRight"
            display={<div>Edit</div>}
            trigger={
              <IconEdit
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onEdit}
              />
            }
          />
        )}

      {(isHovering || isLast) &&
        isAssistant &&
        isMessageLengthValid &&
        isPremiumSubscription && (
          <WithTooltip
            delayDuration={0}
            side="bottom"
            display={
              <div>
                {isLoading
                  ? "Loading..."
                  : isPlaying &&
                      currentPlayingMessageId ===
                        messageSequenceNumber.toString()
                    ? "Stop"
                    : "Read Aloud"}
              </div>
            }
            trigger={
              isLoading ? (
                <IconLoader className="animate-spin" size={MESSAGE_ICON_SIZE} />
              ) : isPlaying &&
                currentPlayingMessageId === messageSequenceNumber.toString() ? (
                <IconPlayerStop
                  className="cursor-pointer hover:opacity-50"
                  size={MESSAGE_ICON_SIZE}
                  onClick={handlePlayClick}
                />
              ) : (
                <IconVolume
                  className="cursor-pointer hover:opacity-50"
                  size={MESSAGE_ICON_SIZE}
                  onClick={handlePlayClick}
                />
              )
            }
          />
        )}

      {(isHovering || isLast) && !isMessageLengthTooShort && isAssistant && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={<div>Copy</div>}
          trigger={
            showCheckmark ? (
              <IconCheck size={MESSAGE_ICON_SIZE} />
            ) : (
              <IconCopy
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={handleCopy}
              />
            )
          }
        />
      )}

      {(isHovering || isLast) && isAssistant && !isTemporaryChat && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={<div>Good Response</div>}
          trigger={
            isGoodResponse ? (
              <IconThumbUpFilled
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onGoodResponse}
              />
            ) : (
              <IconThumbUp
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onGoodResponse}
              />
            )
          }
        />
      )}

      {(isHovering || isLast) && isAssistant && !isTemporaryChat && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={<div>Bad Response</div>}
          trigger={
            isBadResponse ? (
              <IconThumbDownFilled
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onBadResponse}
              />
            ) : (
              <IconThumbDown
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onBadResponse}
              />
            )
          }
        />
      )}

      {isLast && !messageHasImage && !isPremiumSubscription && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={<div>Regenerate</div>}
          trigger={
            <IconRepeat
              className="cursor-pointer hover:opacity-50"
              size={MESSAGE_ICON_SIZE}
              onClick={onRegenerate}
            />
          }
        />
      )}

      {isLast && !messageHasImage && isPremiumSubscription && (
        <SwitchModel
          currentModel={messageModel}
          onChangeModel={onRegenerateSpecificModel}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
