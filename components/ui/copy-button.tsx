import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { IconCheck, IconClipboard } from "@tabler/icons-react"

export function CopyButton({
  value,
  title = "Copy to clipboard",
  variant = "link",
  className
}: {
  value: string
  variant?: "link" | "outline"
  title?: string
  className?: string
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })
  return (
    <Button
      size={"icon"}
      className={cn("size-4 text-red-800 hover:opacity-50", className)}
      variant={variant}
      onClick={() => {
        if (isCopied) return
        copyToClipboard(value)
      }}
    >
      {isCopied ? (
        <IconCheck stroke={1.5} size={16} />
      ) : (
        <IconClipboard stroke={1.5} size={16} />
      )}
    </Button>
  )
}
