import { IconArrowDown } from "@tabler/icons-react"
import { FC } from "react"

interface ChatScrollButtonsProps {
  isAtBottom: boolean
  scrollToBottom: (options?: { force?: boolean }) => Promise<boolean> | boolean
}

export const ChatScrollButtons: FC<ChatScrollButtonsProps> = ({
  isAtBottom,
  scrollToBottom
}) => {
  return (
    <>
      {!isAtBottom && (
        <div
          className="bg-secondary cursor-pointer rounded-full p-1.5 opacity-75 hover:opacity-100"
          onClick={() => {
            void scrollToBottom({ force: true })
          }}
        >
          <IconArrowDown size={18} />
        </div>
      )}
    </>
  )
}
