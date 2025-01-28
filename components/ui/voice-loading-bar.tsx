import React, { FC, memo } from "react"
import { IconLoader } from "@tabler/icons-react"

interface VoiceLoadingBarProps {
  isLoading: boolean
  isEnhancedMenuOpen: boolean
}

const VoiceLoadingBar: FC<VoiceLoadingBarProps> = ({
  isLoading = false,
  isEnhancedMenuOpen
}) => {
  if (!isLoading) return null

  return (
    <div
      className={`bg-secondary ${
        isEnhancedMenuOpen ? "mt-3" : "mt-0"
      } flex min-h-[96px] items-center justify-center rounded-xl px-4 py-3`}
    >
      <IconLoader className="animate-spin text-gray-500" size={24} />
      <span className="ml-2 text-sm text-gray-500">Transcribing...</span>
    </div>
  )
}

export default memo(VoiceLoadingBar)
