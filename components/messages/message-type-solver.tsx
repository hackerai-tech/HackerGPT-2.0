import { Tables } from "@/supabase/types"
import { PluginID } from "@/types/plugins"
import { FC } from "react"
import { MessageMarkdown } from "./message-markdown"
import { MessagePluginFile } from "./message-plugin-file"
import { MessageTerminal } from "./e2b-messages/message-terminal"
import { MessageCitations } from "./message-citations"
import { MessageThinking } from "./message-thinking"

interface MessageTypeResolverProps {
  message: Tables<"messages">
  previousMessage: Tables<"messages"> | undefined
  messageSizeLimit: number
  isLastMessage: boolean
  toolInUse: string
}

// const extractOutputFilename = (content: string) => {
//   const jsonMatch = content.match(/"command"\s*:\s*"(.+?)"/)
//   const commandContent = jsonMatch ? jsonMatch[1] : content

//   const filenameMatch = commandContent.match(/-output\s+(\S+)/)
//   return filenameMatch ? filenameMatch[1].trim() : undefined
// }

export const terminalPlugins = [
  PluginID.TERMINAL,
  PluginID.SQLI_EXPLOITER,
  PluginID.SSL_SCANNER,
  PluginID.DNS_SCANNER,
  PluginID.PORT_SCANNER,
  PluginID.WAF_DETECTOR,
  PluginID.WHOIS_LOOKUP,
  PluginID.SUBDOMAIN_FINDER,
  PluginID.CVE_MAP,
  PluginID.URL_FUZZER,
  PluginID.WORDPRESS_SCANNER,
  PluginID.XSS_EXPLOITER,
  "persistent-sandbox",
  "temporary-sandbox"
]

export const MessageTypeResolver: FC<MessageTypeResolverProps> = ({
  // previousMessage,
  message,
  messageSizeLimit,
  isLastMessage,
  toolInUse
}) => {
  const isPluginOutput =
    message.plugin !== null &&
    message.plugin !== PluginID.NONE.toString() &&
    message.role === "assistant"

  // console.log({
  //   isPluginOutput,
  //   plugin: message.plugin,
  //   role: message.role
  // })

  if (
    (isPluginOutput && terminalPlugins.includes(message.plugin as PluginID)) ||
    terminalPlugins.includes(toolInUse as PluginID)
  ) {
    return (
      <MessageTerminal
        content={message.content}
        messageId={message.id}
        isAssistant={message.role === "assistant"}
      />
    )
  }

  if (
    message.plugin === PluginID.WEB_SEARCH ||
    toolInUse === PluginID.WEB_SEARCH ||
    message.citations?.length > 0
  ) {
    return (
      <MessageCitations
        content={message.content}
        isAssistant={message.role === "assistant"}
        citations={message.citations || []}
      />
    )
  }

  if (
    typeof message.content === "string" &&
    message.content.length > messageSizeLimit
  ) {
    return (
      <MessagePluginFile
        created_at={message.created_at}
        content={message.content}
        plugin={message.plugin ?? PluginID.NONE}
        autoDownloadEnabled={false}
        id={message.id}
        filename={message.plugin + "-" + message.id + ".md"}
        isLastMessage={isLastMessage}
        isAssistant={message.role === "assistant"}
      />
    )
  }

  if (toolInUse === PluginID.REASON_LLM || message.thinking_content) {
    return (
      <MessageThinking
        content={message.content}
        thinking_content={message.thinking_content}
        thinking_elapsed_secs={message.thinking_elapsed_secs}
        isAssistant={message.role === "assistant"}
      />
    )
  }

  return (
    <MessageMarkdown
      content={message.content}
      isAssistant={message.role === "assistant"}
    />
  )
}
