"use client"

import { handleFileUpload } from "@/components/chat/chat-helpers/file-upload"
import { UnsupportedFilesDialog } from "@/components/chat/unsupported-files-dialog"
import { Sidebar } from "@/components/sidebar/sidebar"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import { PentestGPTContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { ContentType } from "@/types"
import {
  IconFileFilled,
  IconLayoutSidebarLeftExpand
} from "@tabler/icons-react"
import { useSearchParams } from "next/navigation"
import {
  FC,
  useContext,
  useCallback,
  useRef,
  useState,
  useMemo,
  useEffect
} from "react"
import { useSelectFileHandler } from "@/components/chat/chat-hooks/use-select-file-handler"
import {
  ActionTypes,
  getInstalledPlugins,
  usePluginContext
} from "../chat/chat-hooks/PluginProvider"
import { availablePlugins } from "@/lib/tools/tool-store/available-tools"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import { useUIContext } from "@/context/ui-context"
import { WithTooltip } from "./with-tooltip"

const DynamicKeyboardShortcutsPopup = dynamic(
  () => import("../chat/keyboard-shortcuts-popup"),
  { ssr: false }
)

const DynamicToolsStore = dynamic(
  () => import("@/components/tools/tools-store"),
  { ssr: false }
)

export const SIDEBAR_WIDTH = 260

interface DashboardProps {
  children: React.ReactNode
}

export const Dashboard: FC<DashboardProps> = ({ children }) => {
  const {
    isPremiumSubscription,
    contentType,
    setContentType,
    newMessageImages
  } = useContext(PentestGPTContext)
  const { isReadyToChat, isMobile, showSidebar, setShowSidebar } =
    useUIContext()

  const searchParams = useSearchParams()
  const tabValue = searchParams.get("tab") || "chats"

  useEffect(() => {
    setContentType(tabValue as ContentType)
  }, [])

  const { handleSelectDeviceFile } = useSelectFileHandler()
  const [isDragging, setIsDragging] = useState(false)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const toggleButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setContentType(tabValue as ContentType)
    if (tabValue === "tools") {
      setShowSidebar(false)
    }
  }, [tabValue, isMobile, setShowSidebar])

  useHotkey("s", () => setShowSidebar(prev => !prev))
  useHotkey("/", () => setIsKeyboardShortcutsOpen(true), { shiftKey: false })

  const handleOverlayClick = useCallback(() => {
    if (isMobile && showSidebar) {
      setShowSidebar(false)
    }
  }, [isMobile, showSidebar, setShowSidebar])

  const { state: pluginState, dispatch: pluginDispatch } = usePluginContext()

  const installPlugin = (pluginId: number) => {
    pluginDispatch({
      type: ActionTypes.INSTALL_PLUGIN,
      payload: pluginId
    })
  }

  const uninstallPlugin = (pluginId: number) => {
    pluginDispatch({
      type: ActionTypes.UNINSTALL_PLUGIN,
      payload: pluginId
    })
  }

  const installedPlugins = getInstalledPlugins(pluginState.installedPluginIds)

  const updatedAvailablePlugins = availablePlugins.map(plugin => ({
    ...plugin,
    isInstalled: installedPlugins.some(p => p.id === plugin.id)
  }))

  const renderContent = () => {
    switch (contentType) {
      case "tools":
        return (
          <DynamicToolsStore
            pluginsData={updatedAvailablePlugins}
            installPlugin={installPlugin}
            uninstallPlugin={uninstallPlugin}
          />
        )
      case "chats":
      default:
        return children
    }
  }

  const onFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    if (!isReadyToChat) {
      setIsDragging(false)
      return
    }

    const items = event.dataTransfer.items
    const files: File[] = []

    if (items && isPremiumSubscription) {
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const item = items[i]
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file) {
            files.push(file)
          }
        }
      }
      handleFileUpload(
        files,
        setShowConfirmationDialog,
        setPendingFiles,
        handleSelectDeviceFile,
        newMessageImages
      )
    }

    if (items.length > 4) {
      toast.error("Maximum of 4 files can be dropped at a time.")
    }

    setIsDragging(false)
  }

  const isDraggingEnabled =
    contentType !== "tools" && isReadyToChat && isPremiumSubscription

  const handleConversionConfirmation = () => {
    pendingFiles.forEach(file => handleSelectDeviceFile(file))
    setShowConfirmationDialog(false)
    setPendingFiles([])
  }

  const handleCancel = () => {
    setPendingFiles([])
    setShowConfirmationDialog(false)
  }

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleToggleSidebar = () => {
    setShowSidebar(prevState => !prevState)
  }

  const sidebarStyle = useMemo(
    () => ({
      minWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
      maxWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
      width: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px"
    }),
    [showSidebar]
  )

  return (
    <div className="flex size-full">
      {showConfirmationDialog && pendingFiles.length > 0 && (
        <UnsupportedFilesDialog
          isOpen={showConfirmationDialog}
          pendingFiles={pendingFiles}
          onCancel={handleCancel}
          onConfirm={handleConversionConfirmation}
        />
      )}

      {!showSidebar && (
        <WithTooltip
          display={"Open sidebar"}
          trigger={
            <Button
              ref={toggleButtonRef}
              className={cn(
                "fixed left-[16px] z-50 size-[32px] cursor-pointer",
                showSidebar && isMobile ? "top-1/2" : "top-3"
              )}
              variant="ghost"
              size="icon"
              onClick={handleToggleSidebar}
            >
              <IconLayoutSidebarLeftExpand size={24} />
            </Button>
          }
          side="bottomRight"
        />
      )}

      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm dark:bg-black/80"
          onClick={handleOverlayClick}
        />
      )}

      <div
        className={cn(
          "bg-tertiary h-full duration-200",
          isMobile ? "fixed z-50" : "relative"
        )}
        style={sidebarStyle}
      >
        {showSidebar && (
          <Tabs className="flex h-full" value={contentType}>
            <Sidebar contentType={contentType} showSidebar={showSidebar} />
          </Tabs>
        )}
      </div>

      {isKeyboardShortcutsOpen && (
        <DynamicKeyboardShortcutsPopup
          isOpen={isKeyboardShortcutsOpen}
          onClose={() => setIsKeyboardShortcutsOpen(false)}
        />
      )}

      <div
        className={cn(
          "bg-background flex min-w-0 flex-1 flex-col",
          isDraggingEnabled && "drag-drop-zone"
        )}
        {...(isDraggingEnabled
          ? {
              onDrop: onFileDrop,
              onDragOver: onDragOver,
              onDragEnter: handleDragEnter,
              onDragLeave: handleDragLeave
            }
          : {})}
      >
        {isDraggingEnabled && isDragging ? (
          <div className="flex h-full items-center justify-center bg-black/50 text-2xl text-white">
            <div className="flex flex-col items-center rounded-lg p-4">
              <IconFileFilled size={48} className="mb-2 text-white" />
              <span className="text-center text-lg font-semibold text-white">
                Drop your files here to add it to the conversation
              </span>
            </div>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  )
}
