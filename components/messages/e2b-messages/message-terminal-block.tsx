import { FC, memo, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { IconDownload } from "@tabler/icons-react"
import { CopyButton, generateRandomString } from "../message-codeblock"
import chalk from "chalk"
import AnsiToHtml from "ansi-to-html"
import stripAnsi from "strip-ansi"
import DOMPurify from "dompurify"

interface MessageTerminalBlockProps {
  value: string
}

const customColors = {
  0: "#000000",
  1: "#FF5555",
  2: "#50FA7B",
  3: "#F1FA8C",
  4: "#BD93F9",
  5: "#FF79C6",
  6: "#8BE9FD",
  7: "#F8F8F2"
}

const converter = new AnsiToHtml({
  fg: "#F8F8F2",
  bg: "#282A36",
  colors: customColors,
  newline: true
})

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

    const formattedValue = useMemo(() => {
      const styledValue = chalk
        .green(value)
        .replace(/\[(\w+)\]/g, (_, word) => chalk.blue.bold(`[${word}]`))
        .replace(/\b(error|warning)\b/gi, match =>
          match.toLowerCase() === "error"
            ? chalk.red.bold(match)
            : chalk.yellow.bold(match)
        )
      
      const htmlWithColors = converter.toHtml(styledValue)
      
      const sanitizedHtml = DOMPurify.sanitize(htmlWithColors, {
        ALLOWED_TAGS: ['span', 'br'],
        ALLOWED_ATTR: ['style'],
        ADD_ATTR: ['target'],
        KEEP_CONTENT: true,
        ALLOW_DATA_ATTR: false
      })

      return sanitizedHtml
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
          dangerouslySetInnerHTML={{ __html: formattedValue }}
        />
      </div>
    )
  }
)

MessageTerminalBlock.displayName = "MessageTerminalBlock"
