import { ContentType } from "@/types"
import { IconFile, IconMessage, IconPuzzle } from "@tabler/icons-react"
import React, { FC, useContext } from "react"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { PentestGPTContext } from "@/context/context"

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

  return (
    <Tabs
      value={contentType}
      defaultValue="chats"
      className="mt-12 w-full pr-2"
      onValueChange={value => onContentTypeChange(value as ContentType)}
    >
      <TabsList className="flex w-full flex-col gap-1 bg-transparent p-0">
        <LabeledSwitchItem
          icon={<IconMessage size={22} />}
          value="chats"
          label="Chats"
          onContentTypeChange={onContentTypeChange}
        />

        {isPremiumSubscription && (
          <LabeledSwitchItem
            icon={<IconFile size={22} />}
            value="files"
            label="Files"
            onContentTypeChange={onContentTypeChange}
          />
        )}

        <LabeledSwitchItem
          icon={<IconPuzzle size={22} />}
          value="gpts"
          label="Explore Plugins"
          onContentTypeChange={onContentTypeChange}
        />
      </TabsList>
    </Tabs>
  )
}
