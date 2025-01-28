import { createContext, useContext, useState } from "react"
import { Fragment } from "@/lib/tools/e2b/fragments/types"
import { ChatMessage } from "@/types/chat-message"
import { updateMessage } from "@/db/messages"

type TabType = "code" | "execution"

interface UseFragmentsReturn {
  fragment: Fragment | null
  isFragmentBarOpen: boolean
  activeTab: TabType
  setFragment: (fragment: Fragment | null, chatMessage?: ChatMessage) => void
  resetFragment: () => void
  openFragmentBar: () => void
  closeFragmentBar: () => void
  toggleFragmentBar: () => void
  setActiveTab: (tab: TabType) => void
  updateFragment: (fragment: Fragment | null) => void
}

const FragmentsContext = createContext<UseFragmentsReturn | undefined>(
  undefined
)

export const FragmentsProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const fragments = useFragmentsHook()
  return (
    <FragmentsContext.Provider value={fragments}>
      {children}
    </FragmentsContext.Provider>
  )
}

export const useFragments = () => {
  const context = useContext(FragmentsContext)
  if (!context) {
    // throw new Error(
    //   "useFragmentsContext must be used within a FragmentsProvider"
    // )
    return {
      fragment: null,
      isFragmentBarOpen: false,
      activeTab: "code" as TabType,
      setFragment: () => {},
      resetFragment: () => {},
      openFragmentBar: () => {},
      closeFragmentBar: () => {},
      toggleFragmentBar: () => {},
      setActiveTab: () => {},
      updateFragment: () => {}
    }
  }
  return context
}

function useFragmentsHook(): UseFragmentsReturn {
  const [fragment, setFragmentState] = useState<Fragment | null>(null)
  const [isFragmentBarOpen, setIsFragmentBarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("code")
  const [chatMessage, setChatMessage] = useState<ChatMessage | null>(null)

  const updateFragment = async (newFragment: Fragment | null) => {
    if (chatMessage) {
      if (chatMessage.isFinal) {
        const fragmentJson = newFragment ? JSON.stringify(newFragment) : null
        const updatedMessage = await updateMessage(chatMessage.message.id, {
          fragment: fragmentJson
        })
        chatMessage.message = updatedMessage
      }

      setFragment(newFragment, chatMessage)
    }
  }

  const setFragment = (
    newFragment: Fragment | null,
    chatMessage?: ChatMessage
  ) => {
    if (!newFragment) {
      if (
        !fragment?.sandboxExecution ||
        fragment.sandboxExecution === "completed"
      ) {
        resetFragment()
      }
      return
    }

    if (!chatMessage) {
      return
    }

    setFragmentState(newFragment)
    setChatMessage(chatMessage)

    if (!isFragmentBarOpen && newFragment.code) {
      setIsFragmentBarOpen(true)
    }

    if (!isFragmentBarOpen) {
      setActiveTab(currentTab => {
        if (
          newFragment.sandboxExecution &&
          newFragment.sandboxExecution === "completed"
        ) {
          return "execution"
        } else if (!newFragment.sandboxExecution) {
          return "code"
        }
        return currentTab
      })
    }
  }

  const resetFragment = () => {
    setFragmentState(null)
    setChatMessage(null)
    setIsFragmentBarOpen(false)
    setActiveTab("code")
  }

  const openFragmentBar = () => setIsFragmentBarOpen(true)
  const closeFragmentBar = () => setIsFragmentBarOpen(false)
  const toggleFragmentBar = () => setIsFragmentBarOpen(prev => !prev)

  return {
    fragment,
    isFragmentBarOpen,
    activeTab,
    setFragment,
    resetFragment,
    openFragmentBar,
    closeFragmentBar,
    toggleFragmentBar,
    setActiveTab,
    updateFragment
  }
}
