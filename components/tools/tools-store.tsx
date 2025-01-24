import React, { useState, useEffect, useContext, useRef } from "react"
import { PentestGPTContext } from "@/context/context"
import { PluginID, PluginSummary } from "@/types/plugins"
import { useChatHandler } from "../chat/chat-hooks/use-chat-handler"
import { Header, SearchBar, CategorySelection } from "./tools"
import { PluginCard } from "./tools-card"
import { useUIContext } from "@/context/ui-context"

interface PluginStorePageProps {
  pluginsData: PluginSummary[]
  installPlugin: (id: number) => void
  uninstallPlugin: (id: number) => void
}

export default function ToolsStorePage({
  pluginsData,
  installPlugin,
  uninstallPlugin
}: PluginStorePageProps) {
  const { handleNewChat } = useChatHandler()

  const { setContentType, subscription } = useContext(PentestGPTContext)

  const { setSelectedPlugin, isEnhancedMenuOpen, setIsEnhancedMenuOpen } =
    useUIContext()

  const filters = [
    "Free",
    "Recon tools",
    "Vulnerability scanners",
    "Exploit tools",
    "Utils",
    "Installed"
  ]
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")
  const categoryRefs = useRef<{
    [key: string]: React.RefObject<HTMLDivElement | null>
  }>({})

  useEffect(() => {
    filters.forEach(filter => {
      categoryRefs.current[filter] = React.createRef<HTMLDivElement>()
    })
  }, [categoryRefs])

  const scrollToCategory = (category: string) => {
    categoryRefs.current[category]?.current?.scrollIntoView({
      behavior: "smooth"
    })
  }

  const excludedPluginIds = [0, 99]

  const filteredPlugins = pluginsData
    .filter(plugin => !excludedPluginIds.includes(plugin.id))
    .filter(plugin => {
      const matchesSearch = plugin.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      return matchesSearch
    })

  const categorizedPlugins = filters.reduce(
    (acc, filter) => {
      acc[filter] = filteredPlugins.filter(plugin => {
        if (filter === "Installed") return plugin.isInstalled
        if (filter === "Free") return !plugin.isPremium
        if (filter === "Recon tools") return plugin.categories.includes("recon")
        if (filter === "Vulnerability scanners")
          return plugin.categories.includes("vuln-scanners")
        if (filter === "Exploit tools")
          return plugin.categories.includes("exploit")
        if (filter === "Utils") return plugin.categories.includes("utils")
        return false
      })
      return acc
    },
    {} as { [key: string]: PluginSummary[] }
  )

  const startChatWithPlugin = async (pluginValue: PluginID) => {
    setContentType("chats")
    await handleNewChat()
    if (!isEnhancedMenuOpen) {
      setIsEnhancedMenuOpen(true)
    }
    setSelectedPlugin(pluginValue)
  }

  const hasPlugins = Object.values(categorizedPlugins).some(
    category => category.length > 0
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl overflow-x-clip px-4 pt-16">
        <Header />
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <CategorySelection
          filters={filters}
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          scrollToCategory={scrollToCategory}
        />

        {hasPlugins ? (
          filters.map(filter => (
            <div key={filter} ref={categoryRefs.current[filter]}>
              {categorizedPlugins[filter].length > 0 && (
                <>
                  <h2 className="text-primary mb-4 text-xl font-semibold">
                    {filter}
                  </h2>
                  <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {categorizedPlugins[filter].map(plugin => (
                      <PluginCard
                        key={plugin.id}
                        plugin={plugin}
                        installPlugin={installPlugin}
                        uninstallPlugin={uninstallPlugin}
                        startChatWithPlugin={startChatWithPlugin}
                        hasSubscription={!!subscription}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-10">
            <p className="text-primary text-lg font-semibold">
              No plugins found
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
