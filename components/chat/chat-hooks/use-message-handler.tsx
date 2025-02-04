import { ChatMessage } from "@/types"

interface UseMessageHandlerProps {
  isGenerating: boolean
  userInput: string
  chatMessages: ChatMessage[]
  handleSendMessage: (
    message: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean,
    shouldAddMessage?: boolean
  ) => void
  handleStopMessage: () => void
}

export const useMessageHandler = ({
  isGenerating,
  userInput,
  chatMessages,
  handleSendMessage,
  handleStopMessage
}: UseMessageHandlerProps) => {
  const sendMessage = () => {
    if (!userInput || isGenerating) return
    handleSendMessage(userInput, chatMessages, false, false)
  }

  const stopMessage = () => {
    if (!isGenerating) return
    handleStopMessage()
  }

  return {
    sendMessage,
    stopMessage,
    canSend: !!userInput && !isGenerating
  }
}
