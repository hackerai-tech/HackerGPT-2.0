import React, { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { IconBackspace, IconX } from "@tabler/icons-react"
import { Button } from "../ui/button"

interface ShortcutItem {
  key: string
  description: string
  icon?: React.ReactNode
}

interface KeyboardShortcutsPopupProps {
  isOpen: boolean
  onClose: () => void
}

export default function KeyboardShortcutsPopup({
  isOpen,
  onClose
}: KeyboardShortcutsPopupProps) {
  const isMac = useMemo(
    () => /macintosh|mac os x/i.test(navigator.userAgent),
    []
  )

  const shortcuts: ShortcutItem[] = useMemo(
    () => [
      {
        key: isMac ? "⌘ + Shift + O" : "Ctrl + Shift + O",
        description: "Open new chat"
      },
      {
        key: isMac ? "⌘ + Shift + L" : "Ctrl + Shift + L",
        description: "Focus chat input"
      },
      {
        key: isMac ? "⌘ + Shift + S" : "Ctrl + Shift + S",
        description: "Toggle sidebar"
      },
      {
        key: isMac ? "⌘ + Shift" : "Ctrl + Shift",
        description: "Delete chat",
        icon: <IconBackspace size={20} />
      },
      {
        key: isMac ? "⌘ + Shift + C" : "Ctrl + Shift + C",
        description: "Copy last response"
      },
      {
        key: isMac ? "⌘ + /" : "Ctrl + /",
        description: "Show shortcuts"
      }
    ],
    [isMac]
  )

  const renderShortcut = (shortcut: ShortcutItem, index: number) => (
    <div
      key={index}
      className="flex items-center justify-between overflow-hidden"
    >
      <div className="flex shrink items-center overflow-hidden text-sm">
        <div className="truncate">{shortcut.description}</div>
      </div>
      <div className="ml-3 flex flex-row gap-2">
        {shortcut.key.split("+").map((key, keyIndex) => (
          <div
            key={keyIndex}
            className="my-2 flex h-8 min-w-[50px] items-center justify-center rounded-md border capitalize"
          >
            <span className="text-xs">{key.trim()}</span>
          </div>
        ))}
        {shortcut.icon && (
          <div className="my-2 flex h-8 min-w-[50px] items-center justify-center rounded-md border">
            {shortcut.icon}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-auto sm:max-w-[796px]">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <DialogTitle className="text-lg font-semibold leading-6">
            Keyboard shortcuts
          </DialogTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            aria-label="Close"
          >
            <IconX size={18} />
          </Button>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-x-9 gap-y-4 p-4 sm:grid-cols-2 sm:p-6">
          {shortcuts.map(renderShortcut)}
        </div>
      </DialogContent>
    </Dialog>
  )
}
