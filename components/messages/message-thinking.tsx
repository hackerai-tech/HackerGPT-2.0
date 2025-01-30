import React, { useState, useCallback } from "react"
import { MessageMarkdown } from "./message-markdown"
import { IconChevronDown, IconChevronUp, IconAtom } from "@tabler/icons-react"
import { useUIContext } from "@/context/ui-context"
import { PluginID } from "@/types/plugins"
import { MessageCitations } from "./message-citations"

interface MessageThinkingProps {
  content: string
  thinking_content?: string | null
  thinking_elapsed_secs?: number | null
  isAssistant: boolean
  citations?: string[]
}

export const MessageThinking: React.FC<MessageThinkingProps> = ({
  content,
  thinking_content,
  thinking_elapsed_secs,
  isAssistant,
  citations = []
}) => {
  const { toolInUse } = useUIContext()
  const [closedBlocks, setClosedBlocks] = useState(new Set<number>())
  const toggleBlock = useCallback((index: number) => {
    setClosedBlocks(prev => {
      const newSet = new Set(prev)
      newSet.has(index) ? newSet.delete(index) : newSet.add(index)
      return newSet
    })
  }, [])

  const formatThinkingTime = (seconds: number | null | undefined) => {
    if (!seconds) return "Thoughts..."

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes === 0) {
      return `Thought for ${seconds} seconds`
    }

    if (remainingSeconds === 0) {
      return `Thought for ${minutes} minutes`
    }

    return `Thought for ${minutes} minutes ${remainingSeconds} seconds`
  }

  if (!thinking_content && citations.length > 0) {
    return (
      <MessageCitations
        content={content}
        isAssistant={isAssistant}
        citations={citations}
      />
    )
  } else if (!thinking_content) {
    return <MessageMarkdown content={content} isAssistant={isAssistant} />
  }

  const isThinking =
    (toolInUse === PluginID.REASONING ||
      toolInUse === PluginID.REASONING_WEB_SEARCH) &&
    !content
  const thinkingTitle = isThinking
    ? "Thinking..."
    : formatThinkingTime(thinking_elapsed_secs)

  return (
    <div>
      {/* Thinking Block */}
      <div className="mb-3 overflow-hidden">
        <button
          className="flex w-full items-center justify-between transition-colors duration-200"
          onClick={() => toggleBlock(0)}
          aria-expanded={!closedBlocks.has(0)}
          aria-controls="thinking-content"
        >
          <div
            className={`flex items-center ${isThinking ? "animate-pulse" : ""}`}
          >
            <IconAtom size={20} />
            <h4 className="text-muted-foreground ml-2 mr-1">{thinkingTitle}</h4>
            {closedBlocks.has(0) ? (
              <IconChevronDown size={16} />
            ) : (
              <IconChevronUp size={16} />
            )}
          </div>
        </button>

        {!closedBlocks.has(0) && (
          <div
            id="thinking-content"
            className="max-h-[12000px] opacity-100 transition-all duration-300 ease-in-out"
          >
            <div className="relative mt-4">
              {/* Vertical line */}
              <div className="bg-muted absolute inset-y-0 left-0 w-1 rounded-full" />
              <div className="pl-6 pr-4">
                <MessageCitations
                  content={thinking_content}
                  isAssistant={isAssistant}
                  citations={citations}
                  reasoningWithCitations={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {content &&
        (citations.length > 0 ? (
          <MessageCitations
            content={content}
            isAssistant={isAssistant}
            citations={citations}
            reasoningWithCitations={false}
          />
        ) : (
          <MessageMarkdown content={content} isAssistant={isAssistant} />
        ))}
    </div>
  )
}
