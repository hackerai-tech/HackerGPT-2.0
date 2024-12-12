import { FC } from "react"
import { IconCode, IconLoader2 } from "@tabler/icons-react"
import { useFragments } from "../chat/chat-hooks/use-fragments"
import { Fragment } from "@/lib/tools/e2b/fragments/types"

interface MessageFragmentProps {
  fragment: Fragment
}

export const MessageFragment: FC<MessageFragmentProps> = ({ fragment }) => {
  const { openFragmentBar, setFragment } = useFragments()

  return (
    <div
      className="ml-0 mt-4 w-full cursor-pointer rounded-xl border hover:bg-white sm:ml-10 md:w-max dark:hover:bg-white/5"
      onClick={() => {
        openFragmentBar()
        setFragment(fragment)
      }}
    >
      <div className="flex items-center py-2 pl-2">
        <div className="flex size-10 items-center justify-center self-stretch rounded-lg bg-black/5 dark:bg-white/5">
          {!fragment.sandboxExecution ? (
            <IconLoader2 className="animate-spin" />
          ) : (
            <IconCode />
          )}
        </div>
        <div className="flex flex-col pl-2 pr-4">
          <span className="text-primary font-sans text-sm font-bold">
            {fragment.title}
          </span>
          <span className="text-muted-foreground font-sans text-sm">
            {fragment.template === "nextjs-developer"
              ? "Click to open code"
              : "Click to see fragment"}
          </span>
        </div>
      </div>
    </div>
  )
}
