import { IconX } from "@tabler/icons-react"
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

export function ChatFragment() {
  const {
    isFragmentBarOpen,
    fragment,
    activeTab,
    setActiveTab,
    closeFragmentBar
  } = useFragments()

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

        <TabsContent value="execution" className="flex-1 overflow-auto">
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
            <div className="size-full flex-1 p-2">
              {fragment.sandboxResult && (
                <iframe
                  src={fragment.sandboxResult.url}
                  className="size-full"
                  style={{ height: "100%", width: "100%" }}
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
