import Loading from "@/app/loading"
import { MessageMarkdown } from "../messages/message-markdown"
import { useFragments } from "./chat-hooks/use-fragments"
import { IconLoader2 } from "@tabler/icons-react"

export function ChatFragment() {
  const { isFragmentBarOpen, fragment, activeTab, setActiveTab } =
    useFragments()

  if (!isFragmentBarOpen || !fragment) {
    return null
  }

  return (
    <div className="border-border flex h-[45%] flex-col overflow-hidden border-b lg:h-auto lg:w-1/2 lg:border-b-0 lg:border-l">
      <div className="flex border-b">
        <button
          className={`p-2 font-medium ${
            activeTab === "code" ? "border-b-2 border-blue-500" : ""
          }`}
          onClick={() => setActiveTab("code")}
        >
          Fragment
        </button>
        <button
          className={`p-2 font-medium ${
            activeTab === "execution" ? "border-b-2 border-blue-500" : ""
          }`}
          onClick={() => setActiveTab("execution")}
        >
          Preview
        </button>
      </div>

      {activeTab === "code" ? (
        <>
          <div className="p-2 font-medium">{fragment.title}</div>
          {fragment.description && (
            <div className="p-2">{fragment.description}</div>
          )}
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
        </>
      ) : (
        <div className="flex-1 p-2">
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
          {/* Execution tab content will go here */}
        </div>
      )}
    </div>
  )
}
