import { useStickToBottom } from "use-stick-to-bottom"
import { useEffect, useCallback } from "react"
import { useUIContext } from "@/context/ui-context"

export const useScroll = () => {
  const { isGenerating } = useUIContext()

  const stickToBottom = useStickToBottom({
    resize: "smooth",
    initial: "smooth"
  })

  const scrollToBottom = useCallback(
    (options?: { force?: boolean }) => {
      return stickToBottom.scrollToBottom({
        animation: "smooth",
        preserveScrollPosition: !options?.force
      })
    },
    [stickToBottom.scrollToBottom]
  )

  useEffect(() => {
    if (isGenerating) {
      void scrollToBottom()
    }
  }, [isGenerating, scrollToBottom])

  return {
    scrollRef: stickToBottom.scrollRef,
    contentRef: stickToBottom.contentRef,
    isAtBottom: stickToBottom.isAtBottom,
    scrollToBottom,
    stopScroll: stickToBottom.stopScroll
  }
}
