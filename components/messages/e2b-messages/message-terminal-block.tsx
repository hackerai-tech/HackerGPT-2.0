import { FC, memo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { IconDownload } from "@tabler/icons-react"
import { CopyButton, generateRandomString } from "../message-codeblock"
import stripAnsi from "strip-ansi"

interface MessageTerminalBlockProps {
  value: string
}

export const MessageTerminalBlock: FC<MessageTerminalBlockProps> = memo(
  ({ value }) => {
    const downloadAsFile = useCallback(() => {
      const suggestedFileName = `terminal-output-${generateRandomString(3, true)}.txt`
      const fileName = window.prompt("Enter file name", suggestedFileName)
      if (!fileName) return

      const blob = new Blob([value], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
    }, [value])

    return (
      <div className="codeblock relative w-full bg-zinc-950 font-sans">
        <div className="sticky top-0 flex w-full items-center justify-between bg-zinc-700 px-4 text-white">
          <span className="text-xs lowercase">Terminal Output</span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-zinc-800 focus-visible:ring-1 focus-visible:ring-slate-700 focus-visible:ring-offset-0"
              onClick={downloadAsFile}
              title="Download as file"
            >
              <IconDownload size={16} />
            </Button>
            <CopyButton value={stripAnsi(value)} />
          </div>
        </div>
        <div
          className="whitespace-pre-wrap break-words p-4 font-mono text-sm text-white"
          style={{ background: "transparent" }}
        >
          {stripAnsi(value)}
        </div>
      </div>
    )
  }
)

MessageTerminalBlock.displayName = "MessageTerminalBlock"
