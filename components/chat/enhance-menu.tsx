import { FC, useContext } from "react"
import PluginSelector from "./plugin-selector"
import { useUIContext } from "@/context/ui-context"
import { PentestGPTContext } from "@/context/context"

export const EnhancedMenuPicker: FC = () => {
  const { isTemporaryChat } = useContext(PentestGPTContext)
  const { setSelectedPluginType } = useUIContext()

  const handleSelectPlugin = (type: string) => {
    setSelectedPluginType(type)
  }

  return (
    <div
      className={`${isTemporaryChat ? "bg-tertiary border-tertiary" : "bg-secondary"} flex min-h-[56px] flex-col space-y-1 rounded-xl px-4 py-2 text-sm`}
    >
      <PluginSelector onPluginSelect={handleSelectPlugin} />
    </div>
  )
}
