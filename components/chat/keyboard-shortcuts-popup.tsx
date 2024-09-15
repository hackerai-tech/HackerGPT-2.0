import React, { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { IconX } from "@tabler/icons-react"
import { Button } from "../ui/button"

interface ShortcutItem {
  key: string
  description: string
}

interface KeyboardShortcutsPopupProps {
  isOpen: boolean
  onClose: () => void
}

export const KeyboardShortcutsPopup: React.FC<KeyboardShortcutsPopupProps> = ({
  isOpen,
  onClose
}) => {
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
      }
    ],
    [isMac]
  )

  const renderShortcut = (shortcut: ShortcutItem, index: number) => (
    <div
      key={index}
      className="text-token-text-primary flex items-center justify-between overflow-hidden"
    >
      <div className="flex shrink items-center overflow-hidden text-sm">
        <div className="truncate">{shortcut.description}</div>
      </div>
      <div className="ml-3 flex flex-row gap-2">
        {shortcut.key.split("+").map((key, keyIndex) => (
          <div
            key={keyIndex}
            className="border-token-border-light text-token-text-secondary my-2 flex h-8 min-w-[50px] items-center justify-center rounded-md border capitalize"
          >
            <span className="text-xs">{key.trim()}</span>
          </div>
        ))}
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
