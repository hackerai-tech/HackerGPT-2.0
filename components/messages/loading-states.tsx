import {
  IconCircleFilled,
  IconFileText,
  IconPuzzle,
  IconTerminal2,
  IconWorld,
  IconAtom
} from "@tabler/icons-react"
import { PluginID } from "@/types/plugins"

export const loadingStates = {
  none: {
    icon: <IconCircleFilled size={20} />,
    text: ""
  },
  retrieval: {
    icon: <IconFileText size={20} />,
    text: "Reading documents..."
  },
  [PluginID.WEB_SEARCH]: {
    icon: <IconWorld size={20} />,
    text: "Searching the web..."
  },
  [PluginID.BROWSER]: {
    icon: <IconWorld size={20} />,
    text: "Browsing the web..."
  },
  [PluginID.REASONING]: {
    icon: <IconAtom size={20} />,
    text: "Thinking..."
  },
  [PluginID.REASONING_WEB_SEARCH]: {
    icon: <IconAtom size={20} />,
    text: "Thinking..."
  },
  ["temporary-sandbox"]: {
    icon: <IconTerminal2 size={20} />,
    text: "Connecting to temporary sandbox (15-min)..."
  },
  ["persistent-sandbox"]: {
    icon: <IconTerminal2 size={20} />,
    text: "Connecting to persistent sandbox..."
  }
}

export const LoadingState = ({ toolInUse }: { toolInUse: string }) => {
  const { icon, text } = loadingStates[
    toolInUse as keyof typeof loadingStates
  ] || {
    icon: <IconPuzzle size={20} />,
    text: `Using ${toolInUse}...`
  }

  if (!text && toolInUse === "none") {
    return icon
  }

  return (
    <div className="flex animate-pulse items-center space-x-2">
      {icon}
      <div>{text}</div>
    </div>
  )
}
