import React, { useState, useEffect, useContext, useRef } from "react"
import {
  IconSearch,
  IconCode,
  IconCircleX,
  IconCloudDownload,
  IconMessagePlus
} from "@tabler/icons-react"
import Image from "next/image"
import { PentestGPTContext } from "@/context/context"
import { PluginSummary } from "@/types/plugins"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { useRouter } from "next/navigation"
import { ContentType } from "@/types"
import { useChatHandler } from "../chat/chat-hooks/use-chat-handler"

interface PluginStorePageProps {
  pluginsData: PluginSummary[]
  installPlugin: (id: number) => void
  uninstallPlugin: (id: number) => void
  setContentType: (contentType: ContentType) => void
}

function GPTsStorePage({
  pluginsData,
  installPlugin,
  uninstallPlugin,
  setContentType
}: PluginStorePageProps) {
  const router = useRouter()
  const { handleNewChat } = useChatHandler()

  const { setSelectedPlugin } = useContext(PentestGPTContext)

  const filters = [
    // "All",
    "Free",
    "Recon tools",
    "Vulnerability scanners",
    "Installed"
  ]
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")
  const categoryRefs = useRef<{
    [key: string]: React.RefObject<HTMLDivElement>
  }>({})

  useEffect(() => {
    filters.forEach(filter => {
      categoryRefs.current[filter] = React.createRef<HTMLDivElement>()
    })
  }, [])

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
        // if (filter === "All") return true
        if (filter === "Installed") return plugin.isInstalled
        if (filter === "Free") return !plugin.isPremium
        if (filter === "Recon tools") return plugin.categories.includes("recon")
        if (filter === "Vulnerability scanners")
          return plugin.categories.includes("vuln-scanners")
        return false
      })
      return acc
    },
    {} as { [key: string]: PluginSummary[] }
  )

  const startChatWithPlugin = (plugin: PluginSummary) => {
    handleNewChat()
    setSelectedPlugin(plugin.value)
    setContentType("chats")
    router.replace(`chat?tab=chats`)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl overflow-x-clip px-4 pt-16">
        <div className="mb-6">
          <h1 className="text-primary mb-4 text-center text-3xl font-bold md:my-4 md:text-5xl">
            Plugins
          </h1>
          <div className="mx-auto mb-8 w-full md:max-w-xl lg:max-w-2xl">
            <p className="text-primary/70 text-center text-sm md:text-lg md:leading-tight">
              Discover custom versions of PentestGPT that combine instructions,
              extra knowledge, and any combination of skills.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6 flex justify-center">
            <div className="relative w-full max-w-2xl">
              <IconSearch
                className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-500"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search GPTs"
                className="z-10 h-12 w-full rounded-xl border py-2 pl-12 pr-3 text-base font-normal outline-0 delay-100 md:h-14"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Category Selection */}
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {filters.map(filter => (
              <Button
                key={filter}
                variant={selectedFilter === filter ? "default" : "outline"}
                onClick={() => {
                  setSelectedFilter(filter)
                  scrollToCategory(filter)
                }}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        {/* Plugin List */}
        {filters.map(filter => (
          <div key={filter} ref={categoryRefs.current[filter]}>
            <h2 className="text-primary mb-4 text-xl font-semibold">
              {filter}
            </h2>
            <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
              {categorizedPlugins[filter].length > 0 ? (
                categorizedPlugins[filter].map(plugin => (
                  <div
                    key={plugin.id}
                    className="border-pgpt-light-gray flex h-[200px] w-full flex-col justify-between rounded-lg border p-4 shadow transition-shadow duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center">
                      <div className="mr-4 size-[60px] shrink-0">
                        <Image
                          src={
                            plugin.icon ||
                            "https://avatars.githubusercontent.com/u/148977464"
                          }
                          alt={plugin.name}
                          width={60}
                          height={60}
                          className={`size-full rounded object-cover ${
                            plugin.invertInDarkMode
                              ? "dark:brightness-0 dark:invert"
                              : ""
                          }`}
                        />
                      </div>

                      <div className="flex flex-1 flex-col justify-between">
                        <h4 className="text-primary flex items-center text-lg">
                          <span className="font-medium">{plugin.name}</span>
                          {plugin.isPremium && (
                            <span className="ml-2 rounded bg-yellow-200 px-2 py-1 text-xs font-semibold uppercase text-yellow-700 shadow">
                              Pro
                            </span>
                          )}
                        </h4>
                        <div className="mt-2 flex items-center space-x-2">
                          <Button
                            variant={
                              plugin.isInstalled ? "destructive" : "default"
                            }
                            size="sm"
                            className="flex w-[140px] items-center justify-center"
                            onClick={() =>
                              plugin.isInstalled
                                ? uninstallPlugin(plugin.id)
                                : installPlugin(plugin.id)
                            }
                          >
                            <span className="flex items-center">
                              {plugin.isInstalled ? (
                                <>
                                  <span className="mr-1">Uninstall</span>
                                  <IconCircleX
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                </>
                              ) : (
                                <>
                                  <span className="mr-1">Install</span>
                                  <IconCloudDownload
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                </>
                              )}
                            </span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => startChatWithPlugin(plugin)}
                          >
                            <IconMessagePlus
                              className="size-5"
                              aria-hidden="true"
                            />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Description and Premium badge */}
                    <p className="text-primary/70 line-clamp-3 h-[60px] text-sm">
                      {plugin.description}
                    </p>
                    {plugin.githubRepoUrl && (
                      <div className="text-primary/60 h-[14px] text-xs">
                        <a
                          href={plugin.githubRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5"
                        >
                          View Source
                          <IconCode className="size-4" aria-hidden="true" />
                        </a>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-10">
                  <p className="text-primary text-lg font-semibold">
                    No plugins found in this category
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GPTsStorePage
