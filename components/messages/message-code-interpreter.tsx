import React, { useState, useMemo } from "react"
import { MessageMarkdown } from "./message-markdown"
import {
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconCode,
  IconExclamationCircle,
  IconLoader2
} from "@tabler/icons-react"

interface MessageCodeInterpreterProps {
  content: string
}

type InterpreterStatus = "idle" | "running" | "finished" | "error"

interface ParsedContent {
  code: string
  results: Array<{ text: string }>
  otherContent: string
  error: string | null
}

export const MessageCodeInterpreter: React.FC<MessageCodeInterpreterProps> = ({
  content
}) => {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(true)
  const [interpreterStatus, setInterpreterStatus] =
    useState<InterpreterStatus>("idle")
  const { code, results, otherContent, error } = useMemo(
    () => parseCodeInterpreterContent(content, setInterpreterStatus),
    [content]
  )

  const hasCodeOutput = code || results.length > 0 || error

  const getStatusIndicator = () => {
    switch (interpreterStatus) {
      case "running":
        return <IconLoader2 size={20} className="animate-spin text-blue-500" />
      case "finished":
        return <IconCircleCheck size={20} className="text-green-500" />
      case "error":
        return <IconExclamationCircle size={20} className="text-red-500" />
      default:
        return null
    }
  }

  return (
    <div>
      {otherContent && (
        <MessageMarkdown content={otherContent} isAssistant={true} />
      )}
      {hasCodeOutput && (
        <div className="border-secondary my-4 overflow-hidden rounded-lg border">
          <button
            className="bg-secondary/50 hover:bg-secondary/100 flex w-full items-center justify-between p-2 transition-colors duration-200"
            onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
            aria-expanded={isAnalysisOpen}
            aria-controls="code-interpreter-content"
          >
            <div className="flex items-center">
              <IconCode size={20} className="mr-2" />
              <h4 className="font-medium">Code Interpreter Output</h4>
              <div className="ml-2">{getStatusIndicator()}</div>
            </div>
            {isAnalysisOpen ? (
              <IconChevronUp size={20} />
            ) : (
              <IconChevronDown size={20} />
            )}
          </button>
          {isAnalysisOpen && (
            <div
              id="code-interpreter-content"
              className={`transition-all duration-300 ease-in-out ${
                isAnalysisOpen
                  ? "max-h-[2000px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              {code && (
                <div className="bg-secondary/25 p-4">
                  <MessageMarkdown
                    content={`\`\`\`python\n${code}\n\`\`\``}
                    isAssistant={true}
                  />
                </div>
              )}
              {error ? (
                <div className="border-secondary border-t p-4">
                  <h5 className="mb-2 font-medium text-red-500">Error:</h5>
                  <MessageMarkdown
                    content={`\`\`\`\n${error}\n\`\`\``}
                    isAssistant={true}
                  />
                </div>
              ) : (
                results.length > 0 && (
                  <div className="border-secondary border-t p-4">
                    <h5 className="mb-2 font-medium">Results:</h5>
                    {results.map((result, index) => (
                      <MessageMarkdown
                        key={index}
                        content={`\`\`\`\n${result.text}\n\`\`\``}
                        isAssistant={true}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const parseCodeInterpreterContent = (
  content: string,
  setInterpreterStatus: React.Dispatch<React.SetStateAction<InterpreterStatus>>
): ParsedContent => {
  const lines = content.split("\n")
  const newContent: ParsedContent = {
    code: "",
    results: [],
    otherContent: "",
    error: null
  }
  let currentSection: "otherContent" = "otherContent"

  lines.forEach(line => {
    try {
      const parsed = JSON.parse(line)
      switch (parsed.type) {
        case "code_interpreter_input":
          newContent.code = parsed.content
          break
        case "code_interpreter_output":
          newContent.results = parsed.content.map((item: any) => ({
            text: typeof item.text === "object" ? item.text.text : item.text
          }))
          break
        case "code_interpreter_status":
          setInterpreterStatus(parsed.status as InterpreterStatus)
          break
        case "error":
          newContent.error = parsed.content
          setInterpreterStatus("error")
          break
        default:
          newContent.otherContent += line + "\n"
      }
    } catch {
      // If it's not JSON, add it to the current section
      newContent[currentSection] += line + "\n"
    }
  })

  // Trim trailing newlines
  newContent.otherContent = newContent.otherContent.trim()

  return newContent
}