import { PentestGPTContext } from "@/context/context"
import { PluginID, PluginSummary } from "@/types/plugins"
import { IconTool } from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useEffect, useRef } from "react"
import { availablePlugins } from "@/lib/tools/tool-store/available-tools"
import { useUIContext } from "@/context/ui-context"

interface ToolPickerProps {
  isOpen: boolean
  searchQuery: string
  onOpenChange: (isOpen: boolean) => void
  onSelectTool: (tool: PluginSummary) => void
  isFocused: boolean
}

export const ToolPicker: FC<ToolPickerProps> = ({
  isOpen,
  searchQuery,
  onOpenChange,
  onSelectTool,
  isFocused
}) => {
  const { isPremiumSubscription, isTemporaryChat } =
    useContext(PentestGPTContext)
  const { setIsToolPickerOpen } = useUIContext()
  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (isFocused && itemsRef.current[0]) {
      itemsRef.current[0].focus()
    }
  }, [isFocused])

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
  }

  const handleSelectTool = (tool: PluginSummary) => {
    if (tool.isPremium && !isPremiumSubscription) {
      return
    }
    onSelectTool(tool)
    handleOpenChange(false)
  }

  const getKeyDownHandler =
    (index: number, tool: PluginSummary) =>
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setIsToolPickerOpen(false)
      } else if (e.key === "Enter") {
        e.preventDefault()
        handleSelectTool(tool)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        const nextIndex = index + 1 < itemsRef.current.length ? index + 1 : 0
        itemsRef.current[nextIndex]?.focus()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        const prevIndex = index === 0 ? itemsRef.current.length - 1 : index - 1
        itemsRef.current[prevIndex]?.focus()
      }
    }

  const filteredTools = availablePlugins.filter(
    tool =>
      (tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.value.toLowerCase().includes(searchQuery.toLowerCase())) &&
      tool.value !== PluginID.NONE &&
      tool.value !== PluginID.PLUGINS_STORE
  )

  return (
    <>
      {isOpen && (
        <div
          className={`flex flex-col space-y-1 rounded-xl border-2 p-2 text-sm ${
            isTemporaryChat ? "bg-tertiary" : "bg-secondary"
          }`}
        >
          {filteredTools.length === 0 ? (
            <div className="text-md flex h-14 cursor-pointer items-center justify-center italic hover:opacity-50">
              No matching tools.
            </div>
          ) : (
            <>
              {[...filteredTools].reverse().map((tool, index) => (
                <div
                  key={tool.id}
                  ref={ref => {
                    itemsRef.current[filteredTools.length - 1 - index] = ref
                  }}
                  tabIndex={tool.isPremium && !isPremiumSubscription ? -1 : 0}
                  className={`flex cursor-pointer items-center rounded p-2 focus:outline-none focus:ring-2
                    ${
                      tool.isPremium && !isPremiumSubscription
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-accent focus:bg-accent/80 focus:ring-primary"
                    }`}
                  onClick={() => handleSelectTool(tool)}
                  onKeyDown={e =>
                    getKeyDownHandler(filteredTools.length - 1 - index, tool)(e)
                  }
                >
                  {tool.icon ? (
                    <Image
                      src={tool.icon}
                      alt={tool.name}
                      width={32}
                      height={32}
                      className={tool.invertInDarkMode ? "dark:invert" : ""}
                    />
                  ) : (
                    <IconTool size={32} />
                  )}
                  <div className="ml-3 flex min-w-0 flex-1 flex-col">
                    <div className="truncate font-bold">{tool.name}</div>
                    <div className="truncate text-sm opacity-80">
                      {tool.description || "No description."}
                    </div>
                  </div>
                  {tool.isPremium && (
                    <div className="ml-3 shrink-0 text-xs font-medium text-yellow-500">
                      PRO
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  )
}
