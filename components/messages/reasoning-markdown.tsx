import React from "react"
import ReactMarkdown, { Components } from "react-markdown"

const components: Partial<Components> = {
  a({ children, href }) {
    return typeof children === "string" && /^\d+$/.test(children) ? (
      <a
        href={href}
        title={href}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-foreground/20 hover:bg-foreground/30 ml-1 inline-flex size-[16px] items-center justify-center rounded-full text-[10px] no-underline"
      >
        {children}
      </a>
    ) : (
      <a href={href}>{children}</a>
    )
  },
  p: ({ children }) => (
    <p className="mb-2 whitespace-pre-wrap text-sm last:mb-0">{children}</p>
  )
}

export const ReasoningMarkdown: React.FC<{ content: string }> = ({
  content
}) => {
  return (
    <ReactMarkdown
      className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 w-[60vw] min-w-full space-y-6 break-words text-sm md:w-full"
      components={components}
    >
      {content}
    </ReactMarkdown>
  )
}
