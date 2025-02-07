import { PentestGPTContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType, DataListType } from "@/types"
import { FC, useCallback, useContext, useEffect, useRef, useState } from "react"
import { ChatItem } from "./items/chat/chat-item"
import { FileItem } from "./items/files/file-item"
import { getMoreChatsByWorkspaceId } from "@/db/chats"
import { Loader2 } from "lucide-react"

interface SidebarDataListProps {
  contentType: ContentType
  data: DataListType
}

export const SidebarDataList: FC<SidebarDataListProps> = ({
  contentType,
  data
}) => {
  const { setChats, isTemporaryChat } = useContext(PentestGPTContext)

  const divRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreChats, setHasMoreChats] = useState(true)

  const fetchMoreChats = useCallback(async () => {
    if (
      (contentType === "chats" || contentType === "tools") &&
      data.length > 0 &&
      !isLoadingMore &&
      hasMoreChats
    ) {
      setIsLoadingMore(true)
      const lastChat = data[data.length - 1] as Tables<"chats">
      const moreChats = await getMoreChatsByWorkspaceId(
        lastChat.workspace_id,
        lastChat.created_at
      )
      if (moreChats.length > 0) {
        setChats((prevChats: Tables<"chats">[]) => [...prevChats, ...moreChats])
      } else {
        setHasMoreChats(false)
      }
      setIsLoadingMore(false)
    }
  }, [contentType, data, isLoadingMore, hasMoreChats, setChats])

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 1.0
    }

    const observer = new IntersectionObserver(entries => {
      const [entry] = entries
      if (entry.isIntersecting && !isLoadingMore && hasMoreChats) {
        fetchMoreChats()
      }
    }, options)

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current)
      }
    }
  }, [loaderRef, isLoadingMore, hasMoreChats, fetchMoreChats])

  const getDataListComponent = (
    contentType: ContentType,
    item: DataItemType
  ) => {
    switch (contentType) {
      case "chats":
        return <ChatItem key={item.id} chat={item as Tables<"chats">} />
      case "files":
        return <FileItem key={item.id} file={item as Tables<"files">} />
      case "tools":
        return <ChatItem key={item.id} chat={item as Tables<"chats">} />
      default:
        return null
    }
  }

  const getSortedData = (
    data: any,
    dateCategory:
      | "Today"
      | "Yesterday"
      | "Previous 7 Days"
      | "Previous 30 Days"
      | "Older"
  ) => {
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const yesterdayStart = new Date(
      new Date().setDate(todayStart.getDate() - 1)
    )
    const oneWeekAgoStart = new Date(
      new Date().setDate(todayStart.getDate() - 7)
    )
    const thirtyDaysAgoStart = new Date(
      new Date().setDate(todayStart.getDate() - 30)
    )

    return data
      .filter((item: any) => {
        const itemDate = new Date(item.updated_at || item.created_at)
        switch (dateCategory) {
          case "Today":
            return itemDate >= todayStart
          case "Yesterday":
            return itemDate >= yesterdayStart && itemDate < todayStart
          case "Previous 7 Days":
            return itemDate >= oneWeekAgoStart && itemDate < yesterdayStart
          case "Previous 30 Days":
            return itemDate >= thirtyDaysAgoStart && itemDate < oneWeekAgoStart
          case "Older":
            return itemDate < thirtyDaysAgoStart
          default:
            return true
        }
      })
      .sort(
        (
          a: { updated_at: string; created_at: string },
          b: { updated_at: string; created_at: string }
        ) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      )
  }

  useEffect(() => {
    if (divRef.current) {
      setIsOverflowing(
        divRef.current.scrollHeight > divRef.current.clientHeight
      )
    }
  }, [data])

  return (
    <div
      ref={divRef}
      className={cn(
        "relative flex h-full flex-col",
        isTemporaryChat ? "overflow-hidden" : "overflow-auto"
      )}
    >
      {isTemporaryChat && (
        <div className="bg-tertiary/80 pointer-events-auto absolute inset-0 z-50" />
      )}
      <div
        className={cn(
          "relative z-10",
          isTemporaryChat && "pointer-events-none"
        )}
      >
        {data.length === 0 && (
          <div className="flex grow flex-col items-center justify-center">
            <div className="text-muted-foreground p-8 text-center text-lg italic">
              No {contentType}.
            </div>
          </div>
        )}

        {data.length > 0 && (
          <div
            className={`h-full ${
              isOverflowing && !isTemporaryChat
                ? "w-[calc(100%-8px)]"
                : "w-full"
            } space-y-3 pt-4 ${isOverflowing && !isTemporaryChat ? "mr-2" : ""}`}
          >
            {contentType === "chats" || contentType === "tools" ? (
              <>
                {[
                  "Today",
                  "Yesterday",
                  "Previous 7 Days",
                  "Previous 30 Days",
                  "Older"
                ].map(dateCategory => {
                  const sortedData = getSortedData(
                    data,
                    dateCategory as
                      | "Today"
                      | "Yesterday"
                      | "Previous 7 Days"
                      | "Previous 30 Days"
                      | "Older"
                  )

                  return (
                    sortedData.length > 0 && (
                      <div key={dateCategory} className="pb-2">
                        <div className="text-muted-foreground bg-tertiary sticky top-0 z-10 mb-1 py-1 pl-2 text-xs font-bold">
                          {dateCategory}
                        </div>

                        <div className={cn("flex grow flex-col")}>
                          {sortedData.map((item: any) => (
                            <div key={item.id}>
                              {getDataListComponent(contentType, item)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )
                })}
                {(contentType === "chats" || contentType === "tools") &&
                  data.length > 0 &&
                  hasMoreChats &&
                  !isTemporaryChat && (
                    <div ref={loaderRef} className="mt-4 flex justify-center">
                      {isLoadingMore && (
                        <Loader2 className="text-primary size-4 animate-spin" />
                      )}
                    </div>
                  )}
              </>
            ) : (
              <div className={cn("flex grow flex-col")}>
                {data.map(item => (
                  <div key={item.id}>
                    {getDataListComponent(contentType, item)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
