import React, { FC } from "react"
import { MessageMarkdown } from "./message-markdown"

interface MessageCitationsProps {
  content: string
  citations?: string[]
  isAssistant: boolean
}

export const MessageCitations: FC<MessageCitationsProps> = ({
  content,
  citations = [],
  isAssistant
}) => {
  // Process content to add citation URLs if available
  const processedContent =
    citations.length > 0
      ? content.replace(/\[(\d+)\]/g, (match, num) => {
          const index = parseInt(num) - 1
          if (citations[index]) {
            return `[${num}](${citations[index]})`
          }
          return match
        })
      : content

  return (
    <MessageMarkdown content={processedContent} isAssistant={isAssistant} />
  )
}
