import React, { useMemo } from "react"
import { MessageMarkdown } from "./message-markdown"

interface MessageImageGeneratorProps {
  content: string | null
  isAssistant: boolean
}

export const MessageImageGenerator: React.FC<MessageImageGeneratorProps> = ({
  content,
  isAssistant
}) => {
  const processedContent = useMemo(() => {
    if (!content) return ""
    return content
      .replace(/<ai_generated_image>.*?<\/ai_generated_image>/gs, "")
      .trim()
  }, [content])

  if (!processedContent) return null

  return (
    <MessageMarkdown content={processedContent} isAssistant={isAssistant} />
  )
}
