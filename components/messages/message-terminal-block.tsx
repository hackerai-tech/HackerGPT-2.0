import { FC, memo, useCallback, useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"
import { IconCheck, IconCopy, IconDownload } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { generateRandomString } from "./message-codeblock"
import ansiHTML from "ansi-to-html"

interface MessageTerminalBlockProps {
  value: string
}

const CopyButton: FC<{ value: string; title?: string; className?: string }> =
  memo(({ value, title = "Copy to clipboard", className }) => {
    const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })
    return (
      <Button
        title={title}
        variant="ghost"
        size="sm"
        className={cn(
          "text-xs text-white hover:bg-zinc-800 focus-visible:ring-1 focus-visible:ring-slate-700 focus-visible:ring-offset-0",
          className
        )}
        onClick={() => !isCopied && copyToClipboard(value)}
        aria-label={isCopied ? "Copied" : "Copy to clipboard"}
      >
        <span className="flex items-center space-x-1">
          {isCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          <span className="hidden sm:inline">
            {isCopied ? "Copied!" : "Copy"}
          </span>
        </span>
      </Button>
    )
  })

CopyButton.displayName = "CopyButton"

const convert = new ansiHTML({
  fg: "#FFF",
  bg: "#000",
  newline: true,
  escapeXML: true,
  stream: false,
  colors: {
    0: "#696969",
    1: "#FF6B68",
    2: "#A8FF60",
    3: "#FFFFB6",
    4: "#96CBFE",
    5: "#FF73FD",
    6: "#C6C5FE",
    7: "#EEEEEE",
    8: "#7C7C7C",
    9: "#FF8785",
    10: "#B6FFB2",
    11: "#FFFFCC",
    12: "#B5DCFE",
    13: "#FF9CFE",
    14: "#DFDFFE",
    15: "#FFFFFF"
  }
})

export const MessageTerminalBlock: FC<MessageTerminalBlockProps> = memo(
  ({ value }) => {
    const [fontSize, setFontSize] = useState(14)
    const terminalRef = useRef<HTMLDivElement>(null)

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

    useEffect(() => {
      const adjustFontSize = () => {
        if (terminalRef.current) {
          const containerHeight = terminalRef.current.clientHeight
          const contentHeight = terminalRef.current.scrollHeight

          if (contentHeight > containerHeight) {
            setFontSize(prevSize => Math.max(prevSize - 0.5, 8))
          } else if (fontSize < 14 && contentHeight < containerHeight * 0.9) {
            setFontSize(prevSize => Math.min(prevSize + 0.5, 14))
          }
        }
      }

      adjustFontSize()
      window.addEventListener("resize", adjustFontSize)
      return () => window.removeEventListener("resize", adjustFontSize)
    }, [value, fontSize])

    const formattedValue = convert.toHtml(value)

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
            <CopyButton value={value} />
          </div>
        </div>
        <div
          ref={terminalRef}
          className="ansi-terminal whitespace-pre-wrap break-words p-4 text-white"
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: "var(--font-mono)",
            margin: 0,
            background: "transparent"
          }}
          dangerouslySetInnerHTML={{ __html: formattedValue }}
        />
      </div>
    )
  }
)

MessageTerminalBlock.displayName = "MessageTerminalBlock"