import { IconLoader2, IconReload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { CopyButton } from "@/components/ui/copy-button"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface FragmentPreviewProps {
  url: string
  isMobile: boolean
  onReload?: () => Promise<void>
  isReloading?: boolean
}

export default function FragmentPreview({
  url,
  isMobile,
  onReload,
  isReloading = false
}: FragmentPreviewProps) {
  const [iframeKey, setIframeKey] = useState(0)

  const handleReload = async () => {
    if (isReloading || !onReload) return

    setIframeKey(prev => prev + 1)
    await onReload()
  }

  return (
    <div className="flex size-full flex-col">
      <div className="relative size-full flex-1">
        {isReloading && (
          <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center">
            <IconLoader2 className="text-primary size-8 animate-spin" />
          </div>
        )}
        <iframe
          key={iframeKey}
          src={url}
          className="size-full"
          sandbox="allow-forms allow-scripts allow-same-origin"
          loading="lazy"
        />
      </div>

      {!isMobile && (
        <div className="border-t p-2">
          <div className="bg-muted flex items-center rounded-2xl dark:bg-white/10">
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground rounded-2xl"
                    onClick={handleReload}
                    disabled={isReloading}
                  >
                    <IconReload
                      className={cn("size-4", isReloading && "animate-spin")}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reload sandbox</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="text-muted-foreground flex-1 truncate text-xs">
              {url}
            </span>

            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <CopyButton
                    value={url}
                    variant="link"
                    className="text-muted-foreground mr-4"
                  />
                </TooltipTrigger>
                <TooltipContent>Copy URL</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  )
}
