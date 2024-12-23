import { ContentType } from "@/types"
import { IconFile, IconMessage, IconPuzzle } from "@tabler/icons-react"
import React, { FC, useContext } from "react"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { PentestGPTContext } from "@/context/context"
import { usePathname, useRouter } from "next/navigation"

interface SidebarSwitcherProps {
  onContentTypeChange: (contentType: ContentType) => void
}

interface LabeledSwitchItemProps {
  onContentTypeChange: (contentType: ContentType) => void
  icon: React.ReactNode
  value: ContentType
  label: string
}

const LabeledSwitchItem: FC<LabeledSwitchItemProps> = ({
  onContentTypeChange,
  icon,
  value,
  label
}) => {
  return (
    <TabsTrigger
      className="hover:bg-accent flex w-full items-center justify-start gap-2 p-2 hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      value={value}
      onClick={() => onContentTypeChange(value)}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </TabsTrigger>
  )
}

export const SidebarSwitcher: FC<SidebarSwitcherProps> = ({
  onContentTypeChange
}) => {
  const { isPremiumSubscription, contentType } = useContext(PentestGPTContext)
  const router = useRouter()
  const pathname = usePathname()

  const handleTabChange = (value: ContentType) => {
    onContentTypeChange(value)
    router.replace(`${pathname}?tab=${value}`)
  }

  return (
    <Tabs
      value={contentType}
      defaultValue="chats"
      className="mt-12 w-full pr-2"
      onValueChange={value => handleTabChange(value as ContentType)}
    >
      <TabsList className="flex w-full flex-col gap-1 bg-transparent p-0">
        <LabeledSwitchItem
          icon={<IconMessage size={22} />}
          value="chats"
          label="Chats"
          onContentTypeChange={handleTabChange}
        />

        {isPremiumSubscription && (
          <LabeledSwitchItem
            icon={<IconFile size={22} />}
            value="files"
            label="Files"
            onContentTypeChange={handleTabChange}
          />
        )}

        <LabeledSwitchItem
          icon={<IconPuzzle size={22} />}
          value="tools"
          label="Explore Plugins"
          onContentTypeChange={handleTabChange}
        />
      </TabsList>
    </Tabs>
  )
}
