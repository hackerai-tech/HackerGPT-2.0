/* eslint-disable tailwindcss/classnames-order */
import { IconX, IconReload, IconDownload } from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { useFragments } from "./chat-hooks/use-fragments"
import { MessageMarkdown } from "../messages/message-markdown"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { CopyButton } from "@/components/ui/copy-button"
import dynamic from "next/dynamic"
import { useUIContext } from "@/context/ui-context"

const DynamicFragmentPreview = dynamic(() => import("./fragment-preview"), {
  ssr: false
})

export function ChatFragment() {
  const [isReloading, setIsReloading] = useState(false)
  const {
    isFragmentBarOpen,
    fragment,
    activeTab,
    setActiveTab,
    closeFragmentBar,
    updateFragment
  } = useFragments()

  const { isMobile } = useUIContext()

  const handleReload = async () => {
    if (
      !fragment ||
      isReloading ||
      !fragment.code ||
      fragment.sandboxExecution !== "completed" ||
      fragment.template === "code-interpreter-v1"
    )
      return

    setIsReloading(true)
    try {
      const response = await fetch("/api/chat/tools/fragments/reload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragment })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(data.message)
        } else {
          toast.error("Failed to reload sandbox")
        }
        return
      }

      updateFragment({
        ...fragment,
        sandboxResult: data.sandboxResult
      })
    } catch (error) {
      toast.error("Failed to reload sandbox")
    } finally {
      setTimeout(() => {
        setIsReloading(false)
      }, 2000)
    }
  }

  const handleDownloadImage = (pngData: string, index: number) => {
    const link = document.createElement("a")
    link.href = `data:image/png;base64,${pngData}`
    const sanitizedTitle = fragment?.title
      ? fragment.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()
      : "chart"
    link.download = `${sanitizedTitle}_${index + 1}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    handleReload()
  }, [fragment?.code])

  if (!isFragmentBarOpen || !fragment) {
    return null
  }

  return (
    <div className="border-border flex h-[45%] flex-col overflow-hidden border-b lg:h-auto lg:w-3/5 lg:border-b-0 lg:border-l">
      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as "code" | "execution")}
        className="flex h-full flex-col"
      >
        <div className="flex w-full items-center justify-between border-b p-2">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    onClick={closeFragmentBar}
                  >
                    <IconX className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close sidebar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!isMobile && (
              <div className="text-sm font-medium">{fragment.title}</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "execution" &&
              fragment.sandboxResult &&
              !fragment.sandboxResult.template.includes("interpreter") &&
              isMobile && (
                <>
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          onClick={handleReload}
                          disabled={isReloading}
                        >
                          <IconReload
                            className={cn(
                              "size-4",
                              isReloading && "animate-spin"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reload sandbox</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {fragment.sandboxResult &&
                    "url" in fragment.sandboxResult && (
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <CopyButton
                              value={fragment.sandboxResult.url}
                              variant="link"
                              className="text-muted-foreground"
                            />
                          </TooltipTrigger>
                          <TooltipContent>Copy URL</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                </>
              )}
            {activeTab === "execution" &&
              fragment.sandboxResult?.template === "code-interpreter-v1" &&
              fragment.sandboxResult.cellResults?.map(
                (result, index) =>
                  result.png && (
                    <TooltipProvider key={index}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground"
                            onClick={() =>
                              handleDownloadImage(result.png!, index)
                            }
                          >
                            <IconDownload className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download chart</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
              )}
            <TabsList className="grid h-8 w-[160px] grid-cols-2 border px-1 py-0">
              <TabsTrigger
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2 py-1 text-xs font-normal"
                value="execution"
              >
                Preview
              </TabsTrigger>
              <TabsTrigger
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2 py-1 text-xs font-normal"
                value="code"
              >
                Code
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="execution" className="-mt-1 flex-1 overflow-auto">
          {fragment.sandboxResult?.template === "code-interpreter-v1" ? (
            <div className="p-2">
              {fragment.sandboxResult.stdout.length > 0 && (
                <div className="mb-4">
                  <MessageMarkdown
                    content={`\`\`\`stdout\n${fragment.sandboxResult.stdout.join("\n")}\n\`\`\``}
                    isAssistant={true}
                  />
                </div>
              )}
              {fragment.sandboxResult.stderr.length > 0 && (
                <div className="mb-4">
                  <MessageMarkdown
                    content={`\`\`\`stderr\n${fragment.sandboxResult.stderr.join("\n")}\n\`\`\``}
                    isAssistant={true}
                  />
                </div>
              )}
              {fragment.sandboxResult.cellResults?.length > 0 &&
                fragment.sandboxResult.cellResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center text-center mb-4"
                  >
                    {result.png && (
                      <Image
                        src={`data:image/png;base64,${result.png}`}
                        alt={`Cell result ${index + 1}`}
                        className="max-w-full"
                        width={1000}
                        height={600}
                      />
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="size-full flex-1">
              {fragment.sandboxResult &&
                !fragment.sandboxResult.template.includes("interpreter") && (
                  <DynamicFragmentPreview
                    url={fragment.sandboxResult.url}
                    isMobile={isMobile}
                    onReload={handleReload}
                    isReloading={isReloading}
                  />
                )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="code" className="flex-1 overflow-auto">
          <div className="flex-1 overflow-auto px-2">
            {fragment.code && (
              <pre className="whitespace-pre-wrap">
                {fragment.sandboxResult?.template === "code-interpreter-v1" ? (
                  <MessageMarkdown
                    content={`\`\`\`python\n${fragment.code}\n\`\`\``}
                    isAssistant={true}
                  />
                ) : (
                  <MessageMarkdown
                    content={`\`\`\`javascript\n${fragment.code}\n\`\`\``}
                    isAssistant={true}
                  />
                )}
              </pre>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
