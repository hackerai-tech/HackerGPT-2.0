import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { PentestGPTContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useState } from "react"
import { Message } from "../messages/message"
import { ChatMessage } from "@/types"

interface ChatMessagesProps {}

export const ChatMessages: FC<ChatMessagesProps> = ({}) => {
  const { chatMessages, temporaryChatMessages, isTemporaryChat } =
    useContext(PentestGPTContext)

  const { handleSendEdit, handleSendFeedback } = useChatHandler()

  const onSendFeedback = (
    chatMessage: ChatMessage,
    feedback: "good" | "bad",
    reason?: string,
    detailedFeedback?: string,
    allowSharing?: boolean,
    allowEmail?: boolean
  ) => {
    handleSendFeedback(
      chatMessage,
      feedback,
      reason,
      detailedFeedback,
      allowSharing,
      allowEmail
    )
  }

  const [editingMessage, setEditingMessage] = useState<Tables<"messages">>()

  const messagesToDisplay = isTemporaryChat
    ? temporaryChatMessages
    : chatMessages

  return (
    <>
      {messagesToDisplay.map((chatMessage, index) => {
        const previousMessage =
          index > 0 ? messagesToDisplay[index - 1].message : undefined
        return (
          <Message
            key={chatMessage.message.id}
            chatMessage={chatMessage}
            previousMessage={previousMessage}
            isEditing={editingMessage?.id === chatMessage.message.id}
            isLast={index === messagesToDisplay.length - 1}
            onStartEdit={setEditingMessage}
            onCancelEdit={() => setEditingMessage(undefined)}
            onSubmitEdit={handleSendEdit}
            onSendFeedback={(
              feedback: "good" | "bad",
              reason?: string,
              detailedFeedback?: string,
              allowSharing?: boolean,
              allowEmail?: boolean
            ) =>
              onSendFeedback(
                chatMessage,
                feedback,
                reason,
                detailedFeedback,
                allowSharing,
                allowEmail
              )
            }
          />
        )
      })}
    </>
  )
}
