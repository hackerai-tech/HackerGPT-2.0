import { createContext, useContext, useState } from "react"
import { Fragment } from "@/lib/tools/fragments/types"

type TabType = "code" | "execution"

interface UseFragmentsReturn {
  fragment: Fragment | null
  isFragmentBarOpen: boolean
  activeTab: TabType
  setFragment: (fragment: Fragment | null) => void
  resetFragment: () => void
  openFragmentBar: () => void
  closeFragmentBar: () => void
  toggleFragmentBar: () => void
  setActiveTab: (tab: TabType) => void
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
    throw new Error(
      "useFragmentsContext must be used within a FragmentsProvider"
    )
  }
  return context
}

function useFragmentsHook(): UseFragmentsReturn {
  const [fragment, setFragmentState] = useState<Fragment | null>(null)
  const [isFragmentBarOpen, setIsFragmentBarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("code")

  const setFragment = (newFragment: Fragment | null) => {
    if (!newFragment) {
      resetFragment()
      return
    }

    setFragmentState(newFragment)

    setIsFragmentBarOpen(currentIsOpen => {
      if (
        !currentIsOpen &&
        (newFragment.title || newFragment.description || newFragment.code)
      ) {
        setActiveTab("code")
        return true
      }
      return currentIsOpen
    })

    if (
      newFragment.sandboxExecution &&
      (newFragment.sandboxExecution === "started" ||
        newFragment.sandboxExecution === "completed") &&
      activeTab === "code"
    ) {
      setActiveTab("execution")
    } else if (!newFragment.sandboxExecution && activeTab === "execution") {
      setActiveTab("code")
    }
  }

  const resetFragment = () => {
    setFragmentState(null)
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
    setActiveTab
  }
}
