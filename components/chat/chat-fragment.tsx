import { IconX, IconReload, IconLoader2 } from "@tabler/icons-react"
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
import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

  const handleReload = async () => {
    if (!fragment || isReloading) return

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
      setIsReloading(false)
    }
  }

  if (!isFragmentBarOpen || !fragment) {
    return null
  }

  return (
    <div className="border-border flex h-[45%] flex-col overflow-hidden border-b lg:h-auto lg:w-1/2 lg:border-b-0 lg:border-l">
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
            <div className="text-sm font-medium">{fragment.title}</div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "execution" &&
              fragment.sandboxResult &&
              !fragment.sandboxResult.template.includes("interpreter") && (
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
                <MessageMarkdown
                  content={`\`\`\`stdout\n${fragment.sandboxResult.stdout.join("\n")}\n\`\`\``}
                  isAssistant={true}
                />
              )}
              {fragment.sandboxResult.stderr.length > 0 && (
                <MessageMarkdown
                  content={`\`\`\`stderr\n${fragment.sandboxResult.stderr.join("\n")}\n\`\`\``}
                  isAssistant={true}
                />
              )}
            </div>
          ) : (
            <div className="size-full flex-1">
              {fragment.sandboxResult && (
                <div className="relative size-full">
                  {isReloading && (
                    <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center">
                      <IconLoader2 className="text-primary size-8 animate-spin" />
                    </div>
                  )}
                  <iframe
                    src={fragment.sandboxResult.url}
                    className="size-full"
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
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
