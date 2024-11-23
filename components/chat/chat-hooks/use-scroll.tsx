import { useStickToBottom } from "use-stick-to-bottom"
import { PentestGPTContext } from "@/context/context"
import { useContext, useEffect, useCallback } from "react"

export const useScroll = () => {
  const { isGenerating } = useContext(PentestGPTContext)

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
