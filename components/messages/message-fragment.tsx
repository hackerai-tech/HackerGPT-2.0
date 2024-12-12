import { FC } from "react"
import { IconCaretRightFilled, IconLoader2 } from "@tabler/icons-react"
import { useFragments } from "../chat/chat-hooks/use-fragments"
import { Fragment } from "@/lib/tools/e2b/fragments/types"

interface MessageFragmentProps {
  fragment: Fragment
}

export const MessageFragment: FC<MessageFragmentProps> = ({ fragment }) => {
  const { openFragmentBar, setFragment } = useFragments()

  return (
    <div
      className="mt-4 w-96 cursor-pointer rounded-lg border p-2"
      onClick={() => {
        openFragmentBar()
        setFragment(fragment)
      }}
    >
      <div className="flex items-center gap-3">
        {!fragment.sandboxExecution && (
          <IconLoader2 className="size-12 animate-spin" />
        )}
        {fragment.sandboxExecution && (
          <IconCaretRightFilled className="size-12" />
        )}
        <div>
          <h3 className="font-medium">{fragment.title}</h3>
          {fragment.description && (
            <p className="text-sm text-gray-600">{fragment.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
