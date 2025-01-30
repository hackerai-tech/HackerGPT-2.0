import { Fragment } from "@/lib/tools/e2b/fragments/types"
import { ChatMessage, DataPartValue } from "@/types"
import { AlertAction } from "@/context/alert-context"
import { processDataStream } from "ai"
import { toast } from "sonner"
import { getTerminalPlugins } from "@/lib/tools/tool-store/tools-helper"
import { PluginID } from "@/types/plugins"

export const processResponse = async (
  response: Response,
  lastChatMessage: ChatMessage,
  controller: AbortController,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>,
  requestBody: object,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  alertDispatch: React.Dispatch<AlertAction>,
  selectedPlugin: PluginID,
  isContinuation: boolean,
  setFragment: (fragment: Fragment | null, chatMessage?: ChatMessage) => void
) => {
  if (!response.ok) {
    const result = await response.json()
    let errorMessage = result.error?.message || "An unknown error occurred"

    switch (response.status) {
      case 400:
        errorMessage = `Bad Request: ${errorMessage}`
        break
      case 401:
        errorMessage = `Invalid Credentials: ${errorMessage}`
        break
      case 402:
        errorMessage = `Out of Credits: ${errorMessage}`
        break
      case 403:
        errorMessage = `Moderation Required: ${errorMessage}`
        break
      case 408:
        errorMessage = `Request Timeout: ${errorMessage}`
        break
      case 429:
        errorMessage = `Rate Limited: ${errorMessage}`
        break
      case 502:
        errorMessage = `Service Unavailable: ${errorMessage}`
        break
      default:
        errorMessage = `HTTP Error: ${errorMessage}`
    }

    throw new Error(errorMessage)
  }

  if (response.body) {
    let fullText = ""
    let thinkingText = ""
    let finishReason = ""
    let thinkingElapsedSecs: number | null = null
    let ragUsed = false
    let ragId = null
    let isFirstChunk = true
    let isFirstChunkReceived = false
    let updatedPlugin = selectedPlugin
    const assistantGeneratedImages: string[] = []
    let toolExecuted = false
    let citations: string[] = []
    let shouldSkipFirstChunk = false
    let fragment: Fragment = {} as Fragment

    try {
      await processDataStream({
        stream: response.body,
        onTextPart: value => {
          if (value && !controller.signal.aborted) {
            // Check if this is the first chunk and matches the last message
            if (isFirstChunk) {
              isFirstChunkReceived = true
              if (
                isContinuation &&
                lastChatMessage?.message?.content === value
              ) {
                shouldSkipFirstChunk = true
                isFirstChunk = false
                return
              }
              setFirstTokenReceived(true)
              isFirstChunk = false
            }

            // Skip if this was a duplicate first chunk
            if (shouldSkipFirstChunk) {
              shouldSkipFirstChunk = false
              return
            }

            fullText += value

            setChatMessages(prev =>
              prev.map(chatMessage =>
                chatMessage.message.id === lastChatMessage.message.id
                  ? {
                      ...chatMessage,
                      message: {
                        ...chatMessage.message,
                        content: chatMessage.message.content + value,
                        image_paths: chatMessage.message.image_paths
                      }
                    }
                  : chatMessage
              )
            )
          }
        },
        onDataPart: value => {
          if (
            Array.isArray(value) &&
            value.length > 0 &&
            !controller.signal.aborted
          ) {
            const firstValue = value[0] as DataPartValue

            if (firstValue.type) {
              if (firstValue.type === "text-delta") {
                // Check if this is the first chunk and matches the last message
                if (isFirstChunk) {
                  isFirstChunkReceived = true
                  if (
                    isContinuation &&
                    lastChatMessage?.message?.content === firstValue.content
                  ) {
                    shouldSkipFirstChunk = true
                    isFirstChunk = false
                    return
                  }
                  setFirstTokenReceived(true)
                  isFirstChunk = false
                }

                // Skip if this was a duplicate first chunk
                if (shouldSkipFirstChunk) {
                  shouldSkipFirstChunk = false
                  return
                }

                fullText += firstValue.content

                setChatMessages(prev =>
                  prev.map(chatMessage =>
                    chatMessage.message.id === lastChatMessage.message.id
                      ? {
                          ...chatMessage,
                          message: {
                            ...chatMessage.message,
                            content: fullText
                          }
                        }
                      : chatMessage
                  )
                )
              }

              if (firstValue.type === "reasoning") {
                if (isFirstChunk) {
                  setFirstTokenReceived(true)
                  isFirstChunk = false
                }

                thinkingText += firstValue.content

                setChatMessages(prev =>
                  prev.map(chatMessage =>
                    chatMessage.message.id === lastChatMessage.message.id
                      ? {
                          ...chatMessage,
                          message: {
                            ...chatMessage.message,
                            thinking_content: thinkingText
                          }
                        }
                      : chatMessage
                  )
                )
              }

              // Handle thinking time
              if (
                firstValue.type === "thinking-time" &&
                firstValue.elapsed_secs
              ) {
                thinkingElapsedSecs = firstValue.elapsed_secs
                setChatMessages(prev =>
                  prev.map(chatMessage =>
                    chatMessage.message.id === lastChatMessage.message.id
                      ? {
                          ...chatMessage,
                          message: {
                            ...chatMessage.message,
                            thinking_elapsed_secs: thinkingElapsedSecs
                          }
                        }
                      : chatMessage
                  )
                )
              }

              // Handle tools errors
              if (firstValue.type === "error") {
                const errorMessage =
                  firstValue.content || "An unknown error occurred"

                if (errorMessage.includes("reached the limit")) {
                  alertDispatch({
                    type: "SHOW",
                    payload: {
                      message: errorMessage,
                      title: "Usage Cap Error"
                    }
                  })
                } else {
                  toast.error(errorMessage)
                }

                setIsGenerating(false)
                controller.abort()
                return
              }

              // Handle sandbox type
              if (firstValue.type === "sandbox-type") {
                if (firstValue.sandboxType === "persistent-sandbox") {
                  setToolInUse("persistent-sandbox")
                } else {
                  setToolInUse("temporary-sandbox")
                }
              }
            }

            // Fragment decoding for fragment API
            if (firstValue.isFragment) {
              const fragmentData = value[1] as Fragment
              fragment = {
                ...fragment,
                ...fragmentData
              }

              if (fragment.commentary && fragment.commentary !== fullText) {
                setFirstTokenReceived(true)
                setToolInUse(PluginID.NONE)
                fullText = fragment.commentary
                setChatMessages(prev =>
                  prev.map(chatMessage =>
                    chatMessage.message.id === lastChatMessage.message.id
                      ? {
                          ...chatMessage,
                          message: {
                            ...chatMessage.message,
                            content: fragment.commentary,
                            image_paths: [],
                            fragment: fragment ? JSON.stringify(fragment) : null
                          }
                        }
                      : chatMessage
                  )
                )
              }
              setFragment(fragment, lastChatMessage)
            }

            // Handle citations
            if (firstValue?.citations) {
              citations = firstValue.citations
            }

            // Handle RAG data
            if (firstValue?.ragUsed !== undefined) {
              ragUsed = Boolean(firstValue.ragUsed)
              ragId =
                firstValue.ragId !== null ? String(firstValue.ragId) : null
            }

            // Handle finishReason
            if (firstValue?.finishReason) {
              if (firstValue.finishReason === "tool-calls") {
                finishReason = "terminal-calls"
              } else {
                finishReason = firstValue.finishReason
              }
            }
          }
        },
        onToolCallPart: async value => {
          if (toolExecuted || controller.signal.aborted) return

          const { toolName } = value
          const toolMap = {
            browser: PluginID.BROWSER,
            terminal: PluginID.TERMINAL,
            webSearch: PluginID.WEB_SEARCH,
            fragments: PluginID.ARTIFACTS
          } as const

          const plugin = toolMap[toolName as keyof typeof toolMap]
          if (plugin) {
            setToolInUse(plugin)
            updatedPlugin = plugin

            if (plugin === PluginID.ARTIFACTS) {
              setFragment(null)
            }
          }

          toolExecuted = true
        },
        onFinishMessagePart: value => {
          if (finishReason === "" && !controller.signal.aborted) {
            // Only set finishReason if it hasn't been set before
            if (
              value.finishReason === "tool-calls" &&
              getTerminalPlugins().includes(updatedPlugin)
            ) {
              // To use continue generating for terminal
              finishReason = "terminal-calls"
            } else if (
              value.finishReason === "length" &&
              !isFirstChunkReceived &&
              isContinuation
            ) {
              finishReason = "stop"
            } else {
              finishReason = value.finishReason
            }
          }
        }
      })
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Unexpected error processing stream:", error)
      }
    }

    return {
      fullText,
      thinkingText,
      thinkingElapsedSecs,
      finishReason,
      ragUsed,
      ragId,
      selectedPlugin: updatedPlugin,
      assistantGeneratedImages,
      citations,
      fragment
    }
  } else {
    throw new Error("Response body is null")
  }
}
