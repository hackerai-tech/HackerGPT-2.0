import { Fragment } from "@/lib/tools/fragments/types"
import { useFragments } from "./chat-hooks/use-fragments"

interface ChatFragmentProps {
  fragment: Fragment | null
  isOpen: boolean
}

export function ChatFragment() {
  const { isFragmentBarOpen, fragment } = useFragments()

  if (!isFragmentBarOpen || !fragment) {
    return null
  }

  return (
    <div className="border-border flex h-[45%] flex-col overflow-hidden border-b lg:h-auto lg:w-1/2 lg:border-b-0 lg:border-l">
      <div className="p-2 font-medium">{fragment.title}</div>
      <div className="flex-1 overflow-auto px-2">
        {/* Fragment content would go here */}
        <pre className="whitespace-pre-wrap">
          <code>{fragment.code}</code>
        </pre>
      </div>
    </div>
  )
}
