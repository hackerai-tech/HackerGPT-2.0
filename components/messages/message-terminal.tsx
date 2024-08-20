import React, { useState, useMemo } from "react"
import { MessageMarkdown } from "./message-markdown"
import {
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconCircleCheck,
  IconExclamationCircle
} from "@tabler/icons-react"
import { PluginID } from "@/types/plugins"
import { MessageTooLong } from "./message-too-long"

interface MessageTerminalProps {
  content: string
  messageId?: string
  isAssistant: boolean
}

interface ParsedContent {
  beforeTerminal: string
  terminalBlock: string
  stdout: string
  stderr: string
  afterTerminal: string
}

type TerminalStatus = "idle" | "running" | "finished" | "error"

export const MessageTerminal: React.FC<MessageTerminalProps> = ({
  content,
  messageId,
  isAssistant
}) => {
  const [isOutputOpen, setIsOutputOpen] = useState(true)
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>("idle")
  const { beforeTerminal, terminalBlock, stdout, stderr, afterTerminal } =
    useMemo(() => parseTerminalContent(content), [content])

  const hasTerminalOutput = terminalBlock || stdout || stderr

  React.useEffect(() => {
    if (terminalBlock && !stdout && !stderr) {
      setTerminalStatus("running")
    } else if (stdout || stderr) {
      setTerminalStatus("finished")
    }
    if (stderr) {
      setTerminalStatus("error")
    }
  }, [terminalBlock, stdout, stderr])

  const getStatusIndicator = () => {
    switch (terminalStatus) {
      case "running":
        return <IconLoader2 size={20} className="animate-spin" />
      case "finished":
        return <IconCircleCheck size={20} className="" />
      case "error":
        return <IconExclamationCircle size={20} className="" />
      default:
        return null
    }
  }

  const renderContent = (content: string) => {
    const contentLength = content.length
    if (contentLength > 12000) {
      return (
        <div className="mt-4">
          <MessageTooLong
            content={content}
            plugin={PluginID.TERMINAL}
            id={messageId || ""}
          />
        </div>
      )
    }
    return <MessageMarkdown content={content} isAssistant={true} />
  }

  return (
    <div>
      {beforeTerminal && (
        <MessageMarkdown content={beforeTerminal} isAssistant={isAssistant} />
      )}
      {hasTerminalOutput && (
        <div className={`mb-2 overflow-hidden ${beforeTerminal && "mt-2"}`}>
          <button
            className="flex w-full items-center justify-between transition-colors duration-200"
            onClick={() => setIsOutputOpen(!isOutputOpen)}
            aria-expanded={isOutputOpen}
            aria-controls="terminal-content"
          >
            <div className="flex items-center">
              <div>{getStatusIndicator()}</div>
              <h4 className="mx-2 font-medium">Terminal</h4>
              {isOutputOpen ? (
                <IconChevronUp size={20} />
              ) : (
                <IconChevronDown size={20} />
              )}
            </div>
          </button>
          {isOutputOpen && (
            <div
              id="terminal-content"
              className={`transition-all duration-300 ease-in-out ${
                isOutputOpen
                  ? "max-h-[12000px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              {terminalBlock && (
                <div className="pt-4">
                  <MessageMarkdown content={terminalBlock} isAssistant={true} />
                </div>
              )}
              {stdout && <div className="mt-2">{renderContent(stdout)}</div>}
              {stderr && <div className="mt-2">{renderContent(stderr)}</div>}
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
    terminalBlock: "",
    stdout: "",
    stderr: "",
    afterTerminal: ""
  }

  // Find the terminal block
  const terminalBlockRegex = /```terminal\n([\s\S]*?)```/
  const terminalBlockMatch = content.match(terminalBlockRegex)

  if (terminalBlockMatch) {
    const terminalIndex = content.indexOf(terminalBlockMatch[0])
    newContent.beforeTerminal = content.slice(0, terminalIndex).trim()
    newContent.terminalBlock = terminalBlockMatch[0]

    // Parse stdout and stderr after the terminal block
    let afterTerminal = content.slice(
      terminalIndex + terminalBlockMatch[0].length
    )

    const stdoutRegex = /```stdout\n([\s\S]*?)```/
    const stderrRegex = /```stderr\n([\s\S]*?)```/

    const stdoutMatch = afterTerminal.match(stdoutRegex)
    const stderrMatch = afterTerminal.match(stderrRegex)

    if (stdoutMatch) {
      newContent.stdout = stdoutMatch[0]
      afterTerminal = afterTerminal.replace(stdoutMatch[0], "")
    }
    if (stderrMatch) {
      newContent.stderr = stderrMatch[0]
      afterTerminal = afterTerminal.replace(stderrMatch[0], "")
    }

    newContent.afterTerminal = afterTerminal.trim()
  } else {
    newContent.beforeTerminal = content
  }

  return newContent
}
