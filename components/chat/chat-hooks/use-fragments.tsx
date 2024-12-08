import { useState } from "react"
import { Fragment } from "@/lib/tools/fragments/types"

interface UseFragmentsReturn {
  fragment: Fragment | null
  isFragmentBarOpen: boolean
  setFragment: (fragment: Fragment) => void
  resetFragment: () => void
  openFragmentBar: () => void
  closeFragmentBar: () => void
  toggleFragmentBar: () => void
}

export function useFragments(): UseFragmentsReturn {
  const [fragment, setFragmentState] = useState<Fragment | null>(null)
  const [isFragmentBarOpen, setIsFragmentBarOpen] = useState(false)

  const setFragment = (newFragment: Fragment) => {
    setFragmentState(newFragment)
    setIsFragmentBarOpen(true)
  }

  const resetFragment = () => {
    setFragmentState(null)
    setIsFragmentBarOpen(false)
  }

  const openFragmentBar = () => setIsFragmentBarOpen(true)
  const closeFragmentBar = () => setIsFragmentBarOpen(false)
  const toggleFragmentBar = () => setIsFragmentBarOpen(prev => !prev)

  return {
    fragment,
    isFragmentBarOpen,
    setFragment,
    resetFragment,
    openFragmentBar,
    closeFragmentBar,
    toggleFragmentBar
  }
}
