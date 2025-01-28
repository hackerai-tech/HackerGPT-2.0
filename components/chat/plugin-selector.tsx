import React, { useContext, useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent
} from "../ui/dropdown-menu"
import {
  IconChevronDown,
  IconLock,
  IconBuildingStore
} from "@tabler/icons-react"
import { PluginID, PluginSummary } from "@/types/plugins"
import { PentestGPTContext } from "@/context/context"
import {
  usePluginContext,
  getInstalledPlugins
} from "./chat-hooks/PluginProvider"
import { availablePlugins } from "@/lib/tools/tool-store/available-tools"
import { TransitionedDialog } from "../ui/transitioned-dialog"
import { DialogPanel } from "@headlessui/react"
import { usePathname, useRouter } from "next/navigation"
import { useUIContext } from "@/context/ui-context"

interface PluginSelectorProps {
  onPluginSelect: (type: string) => void
}

const PluginSelector: React.FC<PluginSelectorProps> = ({ onPluginSelect }) => {
  const {
    isPremiumSubscription,
    chatSettings,
    setContentType,
    isTemporaryChat
  } = useContext(PentestGPTContext)

  const { setSelectedPlugin, selectedPlugin } = useUIContext()

  const [selectedPluginName, setSelectedPluginName] =
    useState("No plugin selected")
  const [showLockedPluginDialog, setShowLockedPluginDialog] = useState(false)
  const [currentPlugin, setCurrentPlugin] = useState<PluginSummary | null>(null)
  const { state: pluginState } = usePluginContext()

  const router = useRouter()
  const pathname = usePathname()

  const defaultPluginIds = [0, 99]

  const handleUpgradeToPlus = () => {
    setShowLockedPluginDialog(false)
    router.push("/upgrade")
  }

  useEffect(() => {
    const foundPlugin = availablePlugins.find(
      plugin => plugin.value === selectedPlugin
    )
    if (foundPlugin) {
      setSelectedPluginName(foundPlugin.name)
    }

    // Check if GPT-4 is selected and ENHANCE_SEARCH is active
    if (
      chatSettings?.model.includes("gpt-4-turbo-preview") &&
      selectedPlugin === PluginID.ENHANCED_SEARCH
    ) {
      setSelectedPlugin(PluginID.NONE)
      setSelectedPluginName("No plugin selected")
      onPluginSelect(PluginID.NONE)
    }
  }, [selectedPlugin, chatSettings?.model])

  const installedPlugins = getInstalledPlugins(pluginState.installedPluginIds)

  const updatedAvailablePlugins = availablePlugins.map(plugin => ({
    ...plugin,
    isInstalled: installedPlugins.some(p => p.id === plugin.id)
  }))

  const selectorPlugins = updatedAvailablePlugins.filter(
    plugin =>
      (plugin.isInstalled || defaultPluginIds.includes(plugin.id)) &&
      !(
        chatSettings?.model.includes("gpt-4-turbo-preview") &&
        plugin.value === PluginID.ENHANCED_SEARCH
      )
  )

  const handleOpenGPTsStore = () => {
    setContentType("tools")
    router.replace(`${pathname}?tab=tools`)
  }

  const renderPluginOptions = () => {
    return selectorPlugins.map(plugin => (
      <DropdownMenuItem
        key={plugin.id}
        onSelect={() => {
          if (!plugin.isPremium || isPremiumSubscription) {
            if (plugin.value === PluginID.PLUGINS_STORE) {
              handleOpenGPTsStore()
            } else {
              onPluginSelect(plugin.value)
              setSelectedPluginName(plugin.name)
              setSelectedPlugin(plugin.value)
            }
          } else {
            setCurrentPlugin(plugin)
            setShowLockedPluginDialog(true)
          }
        }}
        className={`flex items-center justify-between ${plugin.isPremium && !isPremiumSubscription ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span>{plugin.name}</span>
        {plugin.isPremium && !isPremiumSubscription ? (
          <IconLock size={18} className="ml-2" />
        ) : plugin.value === PluginID.PLUGINS_STORE ? (
          <IconBuildingStore size={18} className="ml-2" />
        ) : null}
      </DropdownMenuItem>
    ))
  }

  return (
    <div className="flex items-center justify-start space-x-4">
      <span className="text-sm font-medium">Plugins</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center space-x-2 rounded border border-gray-300 p-2 hover:cursor-pointer">
            <span className="text-sm">{selectedPluginName}</span>
            <button className="flex items-center border-none bg-transparent p-0">
              <IconChevronDown size={18} />
            </button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className={`${
            isTemporaryChat ? "bg-tertiary" : "bg-secondary"
          } z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md`}
        >
          {renderPluginOptions()}
        </DropdownMenuContent>
      </DropdownMenu>
      <LockedPluginModal
        isOpen={showLockedPluginDialog}
        currentPlugin={currentPlugin}
        handleCancelUpgrade={() => setShowLockedPluginDialog(false)}
        handleUpgradeToPlus={handleUpgradeToPlus}
        isPremium={isPremiumSubscription}
      />
    </div>
  )
}

const LockedPluginModal = ({
  isOpen,
  currentPlugin,
  handleCancelUpgrade,
  handleUpgradeToPlus,
  isPremium
}: {
  isOpen: boolean
  currentPlugin: any
  handleCancelUpgrade: () => void
  handleUpgradeToPlus: () => void
  isPremium: boolean
}) => {
  return (
    <TransitionedDialog isOpen={isOpen} onClose={handleCancelUpgrade}>
      <DialogPanel className="bg-popover w-full max-w-lg rounded-md p-10 text-center">
        {!isPremium && (
          <>
            <p>
              The <b>{currentPlugin?.name}</b> plugin is only accessible with a{" "}
              <b>Pro</b> plan.
            </p>
            <p className="mt-2">Ready to upgrade for access?</p>
          </>
        )}
        <div className="mt-5 flex justify-center gap-5">
          <button
            onClick={handleCancelUpgrade}
            className="ring-offset-background focus-visible:ring-ring bg-input text-primary hover:bg-input/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Cancel
          </button>
          {!isPremium && (
            <button
              onClick={handleUpgradeToPlus}
              className="ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Upgrade
            </button>
          )}
        </div>
      </DialogPanel>
    </TransitionedDialog>
  )
}

export default PluginSelector
