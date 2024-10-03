import {
  IconBrandGithub,
  IconBrandX,
  IconKeyboard,
  IconQuestionMark,
  IconCopy
} from "@tabler/icons-react"
import Link from "next/link"
import { FC, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { KeyboardShortcutsPopup } from "./keyboard-shortcuts-popup"
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"
import { Button } from "../ui/button"
import { toast } from "sonner"

interface ChatHelpProps {}

export const ChatHelp: FC<ChatHelpProps> = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false)
  const { copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const socialLinks = [
    { icon: IconBrandX, href: "https://x.com/PentestGPT" },
    {
      icon: IconBrandGithub,
      href: "https://github.com/hackerai-tech/PentestGPT"
    }
  ]

  const handleCopyEmail = () => {
    copyToClipboard("contact@hackerai.co")
    toast.success("Email copied to clipboard", {
      duration: 3000
    })
  }

  const menuItems = [
    {
      icon: IconCopy,
      text: "contact@hackerai.co",
      onClick: handleCopyEmail
    },
    {
      icon: IconKeyboard,
      text: "Keyboard shortcuts",
      onClick: () => setIsKeyboardShortcutsOpen(true)
    }
  ]

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <IconQuestionMark className="bg-primary text-secondary size-[20px] cursor-pointer rounded-full p-0.5 opacity-60 hover:opacity-50 lg:size-[20px]" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="z-50 min-w-[280px] max-w-xs overflow-hidden rounded-2xl p-4 py-2"
        >
          <DropdownMenuLabel className="mb-2 flex items-center justify-between">
            <div className="flex space-x-4">
              {socialLinks.map(({ icon: Icon, href }, index) => (
                <Link
                  key={index}
                  className="cursor-pointer hover:opacity-50"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon size={24} />
                </Link>
              ))}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-2" />

          {menuItems.map(({ icon: Icon, text, onClick }, index) => (
            <DropdownMenuItem key={index} className="cursor-pointer py-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex w-full items-center justify-start space-x-2 p-0 hover:bg-transparent"
                onClick={onClick}
              >
                <Icon className="mr-2 size-5" />
                <span className="text-sm">{text}</span>
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <KeyboardShortcutsPopup
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />
    </>
  )
}
