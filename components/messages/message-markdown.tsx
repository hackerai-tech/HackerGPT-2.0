import React, { FC, memo } from "react"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeMathjax from "rehype-mathjax"
import { MessageCodeBlock } from "./message-codeblock"
import { defaultUrlTransform } from "react-markdown"
import { ImageWithPreview } from "@/components/image/image-with-preview"
import { Table, Th, Td } from "@/components/ui/table-components"
import { MessageTerminalBlock } from "./e2b-messages/message-terminal-block"
import ReactMarkdown, { type Components } from "react-markdown"
import { DownloadCSVTable } from "@/components/ui/download-csv-table"

const urlTransform = (url: string) => {
  if (url.startsWith("data:")) return url
  return defaultUrlTransform(url)
}

const NonMemoizedMarkdown: FC<{
  content: string
  isAssistant: boolean
}> = ({ content, isAssistant }) => {
  if (!isAssistant) {
    return (
      <div className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 bg-secondary min-w-full max-w-[80vw] space-y-6 break-words rounded-3xl py-2.5 px-5 md:w-full">
        <p className="mb-2 whitespace-pre-wrap last:mb-0">{content}</p>
      </div>
    )
  }

  const components: Partial<Components> = {
    a({ children, href, ...props }) {
      if (typeof children === "string" && /^\d+$/.test(children)) {
        return (
          <a
            href={href}
            title={href}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-foreground/20 hover:bg-foreground/30 ml-1 inline-flex size-[16px] items-center justify-center rounded-full text-[10px] no-underline"
          >
            {children}
          </a>
        )
      }
      return (
        <a href={href} {...props}>
          {children}
        </a>
      )
    },
    p({ children }) {
      return <p className="mb-2 whitespace-pre-wrap last:mb-0">{children}</p>
    },
    img({ src, ...props }) {
      return <ImageWithPreview src={src!} alt={props.alt || "image"} />
    },
    table: ({ children, ...props }) => {
      return (
        <div className="w-full">
          <Table {...props}>{children}</Table>
          <DownloadCSVTable />
        </div>
      )
    },
    th: ({ children, ...props }) => <Th {...props}>{children}</Th>,
    td: ({ children, ...props }) => <Td {...props}>{children}</Td>,
    code({ className, children, ...props }) {
      const childArray = React.Children.toArray(children)
      const firstChild = childArray[0] as React.ReactElement
      const firstChildAsString = React.isValidElement(firstChild)
        ? (firstChild as React.ReactElement<any>).props.children
        : firstChild

      if (firstChildAsString === "▍") {
        return <span className="mt-1 animate-pulse cursor-default">▍</span>
      }

      if (typeof firstChildAsString === "string") {
        childArray[0] = firstChildAsString.replace("`▍`", "▍")
      }

      const match = /language-(\w+)/.exec(className || "")

      if (
        typeof firstChildAsString === "string" &&
        !firstChildAsString.includes("\n")
      ) {
        return (
          <code className={className} {...props}>
            {childArray}
          </code>
        )
      }

      if (match && match[1] === "stdout") {
        return (
          <MessageTerminalBlock
            key={Math.random()}
            value={String(childArray).replace(/\n$/, "")}
          />
        )
      }

      return (
        <MessageCodeBlock
          key={Math.random()}
          language={(match && match[1]) || ""}
          value={String(childArray).replace(/\n$/, "")}
          {...props}
        />
      )
    }
  }

  return (
    <ReactMarkdown
      className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 w-[80vw] min-w-full space-y-6 break-words md:w-full [&_mjx-container]:flex [&_mjx-container]:max-w-full [&_mjx-container]:overflow-x-auto [&_mjx-math]:p-2"
      remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
      rehypePlugins={[rehypeMathjax]}
      urlTransform={urlTransform}
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}

export const MessageMarkdown: FC<{
  content: string
  isAssistant: boolean
}> = memo(NonMemoizedMarkdown)
