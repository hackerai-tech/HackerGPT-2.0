import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"
import { IconCheck, IconCopy, IconEye } from "@tabler/icons-react"
import { FC, memo } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { cn } from "@/lib/utils"
import { usePentestGPT } from "@/context/context"

interface MessageCodeBlockProps {
  language: string
  value: string
}

interface languageMap {
  [key: string]: string | undefined
}

export const programmingLanguages: languageMap = {
  javascript: ".js",
  python: ".py",
  java: ".java",
  c: ".c",
  cpp: ".cpp",
  "c++": ".cpp",
  "c#": ".cs",
  ruby: ".rb",
  php: ".php",
  swift: ".swift",
  "objective-c": ".m",
  kotlin: ".kt",
  typescript: ".ts",
  go: ".go",
  perl: ".pl",
  rust: ".rs",
  scala: ".scala",
  haskell: ".hs",
  lua: ".lua",
  shell: ".sh",
  sql: ".sql",
  html: ".html",
  css: ".css",
  terminal: ".txt",
  bash: ".txt"
}

export const generateRandomString = (length: number, lowercase = false) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY3456789" // excluding similar looking characters like Z, 2, I, 1, O, 0
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return lowercase ? result.toLowerCase() : result
}

export const CopyButton: FC<{
  value: string
  title?: string
  className?: string
}> = memo(({ value, title = "Copy to clipboard", className }) => {
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

export const MessageCodeBlock: FC<MessageCodeBlockProps> = memo(
  ({ language, value }) => {
    const { previewActions } = usePentestGPT()
    const { setIsOpen, setCode, setLanguage } = previewActions

    const handlePreview = () => {
      setCode(value)
      setLanguage(language)
      setIsOpen(true)
    }

    return (
      <div className="codeblock relative w-full bg-zinc-950 font-sans">
        <div className="sticky top-0 flex w-full items-center justify-between bg-zinc-700 px-4 text-white">
          <span className="text-xs lowercase">{language}</span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-white hover:bg-zinc-800"
              onClick={handlePreview}
            >
              <IconEye size={16} className="mr-1" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <CopyButton value={value} />
          </div>
        </div>
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{ margin: 0, background: "transparent" }}
          codeTagProps={{
            style: { fontSize: "14px", fontFamily: "var(--font-mono)" }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    )
  }
)

MessageCodeBlock.displayName = "MessageCodeBlock"
