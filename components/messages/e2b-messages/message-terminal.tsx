import React, { useState, useMemo } from "react"
import { MessageMarkdown } from "../message-markdown"
import {
  IconChevronDown,
  IconChevronUp,
  IconTerminal2
} from "@tabler/icons-react"
import { PluginID } from "@/types/plugins"
import { MessageTooLong } from "../message-too-long"

interface MessageTerminalProps {
  content: string
  messageId?: string
  isAssistant: boolean
}

interface TerminalBlock {
  command: string
  stdout: string
  stderr: string
}

interface ContentBlock {
  type: "text" | "terminal"
  content: string | TerminalBlock
}

export const MessageTerminal: React.FC<MessageTerminalProps> = ({
  content,
  messageId,
  isAssistant
}) => {
  const contentBlocks = useMemo(() => parseContent(content), [content])
  const [closedBlocks, setClosedBlocks] = useState<Set<number>>(new Set())

  const toggleBlock = (index: number) => {
    setClosedBlocks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const renderContent = (content: string) =>
    content.length > 12000 ? (
      <div className="mt-4">
        <MessageTooLong
          content={content}
          plugin={PluginID.TERMINAL}
          id={messageId || ""}
        />
      </div>
    ) : (
      <MessageMarkdown content={content} isAssistant={true} />
    )

  return (
    <div>
      {contentBlocks.map((block, index) => (
        <React.Fragment key={index}>
          {block.type === "text" ? (
            <MessageMarkdown
              content={block.content as string}
              isAssistant={isAssistant}
            />
          ) : (
            <div className="my-2 overflow-hidden">
              <button
                className="flex w-full items-center justify-between transition-colors duration-200"
                onClick={() => toggleBlock(index)}
                aria-expanded={!closedBlocks.has(index)}
                aria-controls={`terminal-content-${index}`}
              >
                <div className="flex items-center">
                  <IconTerminal2 size={20} />
                  <h4 className="ml-2 mr-1 text-lg">Terminal</h4>
                  {closedBlocks.has(index) ? (
                    <IconChevronDown size={16} />
                  ) : (
                    <IconChevronUp size={16} />
                  )}
                </div>
              </button>
              {!closedBlocks.has(index) && (
                <div
                  id={`terminal-content-${index}`}
                  className="max-h-[12000px] opacity-100 transition-all duration-300 ease-in-out"
                >
                  <div className="mt-4">
                    <div className="mt-2">
                      <MessageMarkdown
                        content={`\`\`\`terminal\n${(block.content as TerminalBlock).command}\n\`\`\``}
                        isAssistant={true}
                      />
                    </div>
                    {(block.content as TerminalBlock).stdout && (
                      <div className="mt-2">
                        {renderContent(
                          `\`\`\`stdout\n${(block.content as TerminalBlock).stdout}\n\`\`\``
                        )}
                      </div>
                    )}
                    {(block.content as TerminalBlock).stderr && (
                      <div className="mt-2">
                        {renderContent(
                          `\`\`\`stderr\n${(block.content as TerminalBlock).stderr}\n\`\`\``
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

const parseContent = (content: string): ContentBlock[] => {
  const blocks: ContentBlock[] = []
  const blockRegex =
    /(```terminal\n[\s\S]*?```(?:\n```(?:stdout|stderr)\n[\s\S]*?```)*)/g
  const terminalRegex = /```terminal\n([\s\S]*?)```/
  const stdoutRegex = /```stdout\n([\s\S]*?)```/
  const stderrRegex = /```stderr\n([\s\S]*?)```/

  let lastIndex = 0
  let match

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "text",
        content: content.slice(lastIndex, match.index).trim()
      })
    }

    const block = match[1]
    const terminalMatch = block.match(terminalRegex)
    const stdoutMatch = block.match(stdoutRegex)
    const stderrMatch = block.match(stderrRegex)

    if (terminalMatch) {
      blocks.push({
        type: "terminal",
        content: {
          command: terminalMatch[1].trim(),
          stdout: stdoutMatch ? stdoutMatch[1].trim() : "",
          stderr: stderrMatch ? stderrMatch[1].trim() : ""
        }
      })
    }

    lastIndex = blockRegex.lastIndex
  }

  if (lastIndex < content.length) {
    blocks.push({ type: "text", content: content.slice(lastIndex).trim() })
  }

  return blocks
}
