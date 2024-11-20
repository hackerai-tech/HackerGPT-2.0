"use client"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { IconLayoutSidebarRightExpand } from "@tabler/icons-react"
import { LoaderCircle } from "lucide-react"
import { FC } from "react"
import { CodeView } from "./code-view"
import { usePentestGPT } from "@/context/context"

interface PreviewProps {
  isChatLoading: boolean
  isPreviewLoading: boolean
}

export const Preview: FC<PreviewProps> = ({
  isChatLoading,
  isPreviewLoading
}) => {
  const { previewState, previewActions } = usePentestGPT()
  const { code, language, selectedTab } = previewState
  const { setIsOpen, setSelectedTab } = previewActions

  return (
    <div className="bg-popover relative h-full w-1/2 overflow-hidden border-l md:rounded-l-3xl">
      <Tabs
        value={selectedTab}
        onValueChange={value => setSelectedTab(value as "code" | "preview")}
        className="flex h-full flex-col items-start justify-start"
      >
        <div className="grid w-full grid-cols-3 items-center border-b p-2">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <IconLayoutSidebarRightExpand className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close sidebar</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex justify-center">
            <TabsList className="h-8 border px-1 py-0">
              <TabsTrigger
                className="flex items-center gap-1 px-2 py-1 text-xs font-normal"
                value="code"
              >
                {isChatLoading && (
                  <LoaderCircle
                    strokeWidth={3}
                    className="size-3 animate-spin"
                  />
                )}
                Code
              </TabsTrigger>
              <TabsTrigger
                className="flex items-center gap-1 px-2 py-1 text-xs font-normal"
                value="preview"
              >
                Preview
                {isPreviewLoading && (
                  <LoaderCircle
                    strokeWidth={3}
                    className="size-3 animate-spin"
                  />
                )}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="h-[calc(100%-48px)] w-full overflow-y-auto">
          <TabsContent value="code" className="m-0 h-full">
            {code && language && <CodeView code={code} lang={language} />}
          </TabsContent>
          <TabsContent value="preview" className="m-0 h-full">
            <div className="p-4">Preview content goes here</div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
