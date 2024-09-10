import React from "react"
import {
  IconCode,
  IconCircleX,
  IconCloudDownload,
  IconMessagePlus,
  IconLockOpen
} from "@tabler/icons-react"
import Image from "next/image"
import { Button } from "../ui/button"
import { PluginID, PluginSummary } from "@/types/plugins"
import { useRouter } from "next/navigation"

interface PluginCardProps {
  plugin: PluginSummary
  installPlugin: (id: number) => void
  uninstallPlugin: (id: number) => void
  startChatWithPlugin: (pluginValue: PluginID) => void
  hasSubscription: boolean
}

export function PluginCard({
  plugin,
  installPlugin,
  uninstallPlugin,
  startChatWithPlugin,
  hasSubscription
}: PluginCardProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push("/upgrade")
  }

  return (
    <div className="border-pgpt-light-gray flex h-[200px] w-full flex-col justify-between rounded-lg border p-4 shadow transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center">
        <div className="mr-4 size-[60px] shrink-0">
          <Image
            src={
              plugin.icon || "https://avatars.githubusercontent.com/u/148977464"
            }
            alt={plugin.name}
            width={60}
            height={60}
            className={`size-full rounded object-cover ${plugin.invertInDarkMode ? "dark:brightness-0 dark:invert" : ""}`}
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
                plugin.isPremium && !hasSubscription
                  ? "default"
                  : plugin.isInstalled
                    ? "destructive"
                    : "default"
              }
              size="sm"
              className="flex w-[140px] items-center justify-center"
              onClick={() => {
                if (plugin.isPremium && !hasSubscription) {
                  handleUpgrade()
                } else {
                  plugin.isInstalled
                    ? uninstallPlugin(plugin.id)
                    : installPlugin(plugin.id)
                }
              }}
            >
              <span className="flex items-center">
                {plugin.isPremium && !hasSubscription ? (
                  <>
                    <span className="mr-1">Upgrade</span>
                    <IconLockOpen className="size-4" aria-hidden="true" />
                  </>
                ) : plugin.isInstalled ? (
                  <>
                    <span className="mr-1">Uninstall</span>
                    <IconCircleX className="size-4" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span className="mr-1">Install</span>
                    <IconCloudDownload className="size-4" aria-hidden="true" />
                  </>
                )}
              </span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => {
                if (plugin.isPremium && !hasSubscription) {
                  handleUpgrade()
                } else {
                  startChatWithPlugin(plugin.value)
                }
              }}
              title={
                plugin.isPremium && !hasSubscription
                  ? "Upgrade to use this plugin"
                  : "Start chat with this plugin"
              }
            >
              {plugin.isPremium && !hasSubscription ? (
                <IconLockOpen className="size-5" aria-hidden="true" />
              ) : (
                <IconMessagePlus className="size-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>
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
  )
}
