import React, { useState, useMemo, useCallback } from "react"
import { MessageMarkdown } from "../message-markdown"
import {
  IconChevronDown,
  IconChevronUp,
  IconExclamationCircle,
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

interface ParsedContent {
  beforeTerminal: string
  terminalBlocks: TerminalBlock[]
  afterTerminal: string
}

export const MessageTerminal: React.FC<MessageTerminalProps> = ({
  content,
  messageId,
  isAssistant
}) => {
  const [isOutputOpen, setIsOutputOpen] = useState(true)

  const { beforeTerminal, terminalBlocks, afterTerminal, hasTerminalOutput } =
    useMemo(() => {
      const parsed = parseTerminalContent(content)
      return {
        ...parsed,
        hasTerminalOutput: parsed.terminalBlocks.length > 0
      }
    }, [content])

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
      {beforeTerminal && (
        <MessageMarkdown content={beforeTerminal} isAssistant={isAssistant} />
      )}
      {hasTerminalOutput && (
        <div className={`mb-2 overflow-hidden ${beforeTerminal ? "mt-2" : ""}`}>
          <button
            className="flex w-full items-center justify-between transition-colors duration-200"
            onClick={() => setIsOutputOpen(prev => !prev)}
            aria-expanded={isOutputOpen}
            aria-controls="terminal-content"
          >
            <div className="flex items-center">
              <IconTerminal2 size={20} />
              <h4 className="ml-2 mr-1 text-lg">Terminal</h4>
              {isOutputOpen ? (
                <IconChevronUp size={16} />
              ) : (
                <IconChevronDown size={16} />
              )}
            </div>
          </button>
          {isOutputOpen && (
            <div
              id="terminal-content"
              className="max-h-[12000px] opacity-100 transition-all duration-300 ease-in-out"
            >
              {terminalBlocks.map((block, index) => (
                <div
                  key={index}
                  className="mt-4 border-t pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center">
                    {block.stderr && <IconExclamationCircle size={20} />}
                    <h5 className="ml-2 font-medium">Command {index + 1}</h5>
                  </div>
                  <div className="mt-2">
                    <MessageMarkdown
                      content={`\`\`\`terminal\n${block.command}\n\`\`\``}
                      isAssistant={true}
                    />
                  </div>
                  {block.stdout && (
                    <div className="mt-2">
                      {renderContent(`\`\`\`stdout\n${block.stdout}\n\`\`\``)}
                    </div>
                  )}
                  {block.stderr && (
                    <div className="mt-2">
                      {renderContent(`\`\`\`stderr\n${block.stderr}\n\`\`\``)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {afterTerminal && (
        <MessageMarkdown content={afterTerminal} isAssistant={isAssistant} />
      )}
    </div>
  )
}

const parseTerminalContent = (content: string): ParsedContent => {
  const newContent: ParsedContent = {
    beforeTerminal: "",
    terminalBlocks: [],
    afterTerminal: ""
  }

  const blockRegex =
    /(```terminal\n[\s\S]*?```(?:\n```(?:stdout|stderr)\n[\s\S]*?```)*)/g
  const terminalRegex = /```terminal\n([\s\S]*?)```/
  const stdoutRegex = /```stdout\n([\s\S]*?)```/
  const stderrRegex = /```stderr\n([\s\S]*?)```/

  let match
  let lastIndex = 0
  while ((match = blockRegex.exec(content)) !== null) {
    if (newContent.terminalBlocks.length === 0) {
      newContent.beforeTerminal = content.slice(lastIndex, match.index).trim()
    }

    const block = match[1]
    const terminalMatch = block.match(terminalRegex)
    const stdoutMatch = block.match(stdoutRegex)
    const stderrMatch = block.match(stderrRegex)

    if (terminalMatch) {
      const terminalBlock: TerminalBlock = {
        command: terminalMatch[1].trim(),
        stdout: stdoutMatch ? stdoutMatch[1].trim() : "",
        stderr: stderrMatch ? stderrMatch[1].trim() : ""
      }
      newContent.terminalBlocks.push(terminalBlock)
    }

    lastIndex = blockRegex.lastIndex
  }

  newContent.afterTerminal = content.slice(lastIndex).trim()

  return newContent
}
