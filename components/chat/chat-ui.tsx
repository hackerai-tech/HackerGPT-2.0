import Loading from "@/app/loading"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { PentestGPTContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import {
  IconInfoCircle,
  IconMessageOff,
  IconPlayerTrackNext,
  IconRefresh
} from "@tabler/icons-react"
import { useParams, useRouter } from "next/navigation"
import {
  FC,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react"
import { Button } from "../ui/button"
import { WithTooltip } from "../ui/with-tooltip"
import { ChatFragment } from "./chat-fragment"
import { ChatHelp } from "./chat-help"
import { useScroll } from "./chat-hooks/use-scroll"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"
import { ChatScrollButtons } from "./chat-scroll-buttons"
import { ChatSecondaryButtons } from "./chat-secondary-buttons"
import { ChatSettings } from "./chat-settings"
import { GlobalDeleteChatDialog } from "./global-delete-chat-dialog"
import { useFragments } from "./chat-hooks/use-fragments"
import { Settings } from "../utility/settings"
import { ShareChatButton } from "./chat-share-button"

interface ChatUIProps {}

export const ChatUI: FC<ChatUIProps> = ({}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useHotkey("o", () => handleNewChat())
  useHotkey("Backspace", () => {
    if (selectedChat) {
      setIsDeleteDialogOpen(true)
    }
  })

  const params = useParams()
  const router = useRouter()

  const {
    chatMessages,
    selectedChat,
    isGenerating,
    setIsReadyToChat,
    showSidebar,
    isTemporaryChat,
    setTemporaryChatMessages,
    fetchMessages,
    fetchChat,
    loadMoreMessages,
    isLoadingMore,
    allMessagesLoaded,
    isMobile
  } = useContext(PentestGPTContext)

  const {
    handleNewChat,
    handleFocusChatInput,
    handleSendContinuation,
    handleSendTerminalContinuation
  } = useChatHandler()

  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useScroll()

  const [loading, setLoading] = useState(true)
  const previousHeightRef = useRef<number | null>(null)

  const { resetFragment, isFragmentBarOpen } = useFragments()

  useEffect(() => {
    const fetchData = async () => {
      if (!isTemporaryChat) {
        resetFragment()
        await Promise.all([
          fetchMessages(params.chatid as string, params.workspaceid as string),
          fetchChat(params.chatid as string, params.workspaceid as string)
        ])
        scrollToBottom()
      }
    }

    if (
      !isTemporaryChat &&
      ((chatMessages?.length === 0 && !params.chatid) || params.chatid)
    ) {
      setIsReadyToChat(false)
      fetchData().then(() => {
        handleFocusChatInput()
        setLoading(false)
        setIsReadyToChat(true)
      })
    } else {
      setLoading(false)
      setIsReadyToChat(true)
    }
  }, [])

  const loadMoreMessagesInner = useCallback(async () => {
    if (
      isTemporaryChat ||
      allMessagesLoaded ||
      isLoadingMore ||
      !chatMessages.length
    )
      return

    const chatId = params.chatid as string

    if (!chatId) {
      console.error("Chat ID is undefined")
      return
    }

    const scrollContainer = scrollRef.current
    if (scrollContainer) {
      previousHeightRef.current = scrollContainer.scrollHeight
    }

    loadMoreMessages(chatId)
  }, [
    isTemporaryChat,
    allMessagesLoaded,
    isLoadingMore,
    chatMessages,
    loadMoreMessages,
    params.chatid,
    scrollRef
  ])

  useLayoutEffect(() => {
    if (isLoadingMore) {
      setTimeout(() => {
        const scrollContainer = scrollRef.current
        if (scrollContainer && previousHeightRef.current !== null) {
          const newHeight = scrollContainer.scrollHeight
          const previousHeight = previousHeightRef.current
          const scrollDifference = newHeight - previousHeight

          // console.log("newHeight", newHeight)
          // console.log("previousHeight", previousHeight)
          // console.log("scrollDifference", scrollDifference)
          // console.log("scrollContainer.scrollTop", scrollContainer.scrollTop)
          // Adjust scroll position
          scrollContainer.scrollTop = scrollDifference
          // Reset previousHeightRef for next load
          previousHeightRef.current = null
        }
      }, 200) // allow some time for the new messages to render
    }
  }, [chatMessages, isLoadingMore, scrollRef])

  const innerHandleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop } = e.currentTarget

      if (scrollTop === 0) {
        loadMoreMessagesInner()
      }
    },
    [loadMoreMessagesInner]
  )

  const handleCleanChat = () => {
    resetFragment()
    setTemporaryChatMessages([])
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="relative flex h-full flex-col items-center">
      {!isTemporaryChat ? (
        <div className="absolute right-[22px] top-1 flex h-[40px] items-center space-x-3">
          {!isMobile ? (
            <>
              <ShareChatButton variant="chatUI" />
              <WithTooltip
                display={<div>Settings</div>}
                trigger={<Settings />}
              />
            </>
          ) : (
            <ChatSecondaryButtons />
          )}
        </div>
      ) : (
        <div className="absolute right-[22px] top-1 flex h-[40px] items-center space-x-3">
          {isMobile ? (
            <WithTooltip
              delayDuration={200}
              display={isTemporaryChat ? "Clean chat" : "New chat"}
              trigger={
                isTemporaryChat && (
                  <IconRefresh
                    className="cursor-pointer hover:opacity-50"
                    size={24}
                    onClick={handleCleanChat}
                  />
                )
              }
              side="bottomRight"
            />
          ) : (
            <WithTooltip display={<div>Settings</div>} trigger={<Settings />} />
          )}
        </div>
      )}

      {isTemporaryChat && (
        <div className="absolute left-1/2 top-4 hidden -translate-x-1/2 md:block">
          <div className="text-muted-foreground flex items-center gap-1 space-x-1 px-2 py-1 text-sm">
            <IconMessageOff size={16} />
            <span>Temporary Chat</span>
            <WithTooltip
              delayDuration={300}
              side="bottom"
              display={
                <div className="max-w-[300px] text-center">
                  Temporary chats won&apos;t appear in your history, and
                  PentestGPT won&apos;t retain any information from these
                  conversations.
                </div>
              }
              trigger={<IconInfoCircle size={16} />}
            />
          </div>
        </div>
      )}

      <div className="flex size-full flex-col">
        {/* Chat settings - Top Bar */}
        <div
          className={`flex max-h-[50px] min-h-[50px] w-full items-center justify-center font-bold sm:justify-start ${showSidebar ? "sm:pl-2" : "sm:pl-12"}`}
        >
          <div className="mt-2 max-w-[230px] truncate text-sm sm:max-w-[400px] sm:text-base md:max-w-[500px] lg:max-w-[600px] xl:w-[800px]">
            <ChatSettings handleCleanChat={handleCleanChat} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row-reverse">
          {/* Fragments */}
          <ChatFragment />

          {/* Chat messages container */}
          <div className="flex h-[45%] flex-1 flex-col overflow-hidden lg:h-auto">
            {/* Chat messages */}
            <div
              ref={scrollRef}
              className="flex flex-1 flex-col overflow-auto"
              onScroll={innerHandleScroll}
            >
              <div ref={contentRef}>
                <ChatMessages />
              </div>
            </div>

            {/* Scroll buttons and continuation button */}
            <div className="relative w-full items-end">
              <div className="absolute -top-10 left-1/2 flex -translate-x-1/2 justify-center">
                <ChatScrollButtons
                  isAtBottom={isAtBottom}
                  scrollToBottom={scrollToBottom}
                />
              </div>

              {!isGenerating &&
                (selectedChat?.finish_reason === "length" ||
                  selectedChat?.finish_reason === "terminal-calls") && (
                  <div className="flex w-full justify-center p-2">
                    <Button
                      onClick={
                        selectedChat?.finish_reason === "terminal-calls"
                          ? handleSendTerminalContinuation
                          : handleSendContinuation
                      }
                      variant="secondary"
                      className="flex items-center space-x-1 px-4 py-2"
                    >
                      <IconPlayerTrackNext size={16} />
                      <span>Continue generating</span>
                    </Button>
                  </div>
                )}
            </div>

            {/* Chat input */}
            <div className="flex w-full justify-center">
              <div
                className={`z-10 w-screen items-end px-2 pb-3 sm:w-[600px] sm:pb-5 md:w-[650px] md:min-w-[300px] lg:w-[700px] xl:w-[800px]`}
              >
                <ChatInput />
              </div>
            </div>

            {/* Chat help */}
            <div
              className={`absolute bottom-2 right-2 hidden md:block lg:bottom-4 ${
                isFragmentBarOpen ? "lg:right-[calc(50%+0.5rem)]" : "lg:right-4"
              }`}
            >
              <ChatHelp />
            </div>
          </div>
        </div>
      </div>

      <GlobalDeleteChatDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </div>
  )
}
