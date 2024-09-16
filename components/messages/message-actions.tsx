import { PentestGPTContext } from "@/context/context"
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconRepeat,
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useState } from "react"
import { WithTooltip } from "../ui/with-tooltip"
import { ChangeModelIcon } from "../ui/change-model-icon"

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
  const { isGenerating, isMobile, subscription } = useContext(PentestGPTContext)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const isPremium = subscription !== null

  const MESSAGE_ICON_SIZE = isMobile ? 22 : 20
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

  return (isLast && isGenerating) || isEditing ? null : (
    <div
      className={`text-muted-foreground flex items-center ${isMobile ? "ml-3 space-x-4" : "space-x-3"}`}
    >
      {(isHovering || isLast) && !isAssistant && !messageHasImage && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
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

      {(isHovering || isLast) && !isMessageLengthTooShort && (
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

      {isLast && !messageHasImage && (
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

      {(isHovering || isLast) && isAssistant && (
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

      {(isHovering || isLast) && isAssistant && (
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

      {isLast && !messageHasImage && isPremium && (
        <ChangeModelIcon
          currentModel={messageModel}
          onChangeModel={onRegenerateSpecificModel}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
