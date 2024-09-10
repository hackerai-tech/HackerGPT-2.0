"use client"

import { handleFileUpload } from "@/components/chat/chat-helpers/file-upload"
import { UnsupportedFilesDialog } from "@/components/chat/unsupported-files-dialog"
import { Sidebar } from "@/components/sidebar/sidebar"
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher"
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
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  FC,
  useContext,
  useCallback,
  useRef,
  useState,
  useMemo,
  useEffect
} from "react"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"
import GPTsStorePage from "@/components/gpts/gpts-store"
import {
  ActionTypes,
  getInstalledPlugins,
  usePluginContext
} from "../chat/chat-hooks/PluginProvider"
import { availablePlugins } from "@/lib/plugins/available-plugins"
import { toast } from "sonner"

export const SIDEBAR_WIDTH = 350

interface DashboardProps {
  children: React.ReactNode
}

export const Dashboard: FC<DashboardProps> = ({ children }) => {
  const {
    subscription,
    chatSettings,
    isReadyToChat,
    isMobile,
    showSidebar,
    setShowSidebar,
    selectedChat
  } = useContext(PentestGPTContext)

  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabValue = searchParams.get("tab") || "chats"

  const { handleSelectDeviceFile } = useSelectFileHandler()
  const [contentType, setContentType] = useState<ContentType>(
    tabValue as ContentType
  )
  const [isDragging, setIsDragging] = useState(false)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const toggleButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isMobile && selectedChat) {
      setShowSidebar(false)
    }
  }, [isMobile, selectedChat, setShowSidebar])

  useHotkey("s", () => setShowSidebar(prev => !prev))

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
      case "gpts":
        return (
          <GPTsStorePage
            pluginsData={updatedAvailablePlugins}
            installPlugin={installPlugin}
            uninstallPlugin={uninstallPlugin}
            setContentType={setContentType}
          />
        )
      case "chats":
      case "files":
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

    if (items && subscription) {
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
        chatSettings,
        setShowConfirmationDialog,
        setPendingFiles,
        handleSelectDeviceFile
      )
    }

    if (items.length > 5) {
      toast.error("Maximum of 5 files can be dropped at a time.")
    }

    setIsDragging(false)
  }

  const isDraggingEnabled =
    contentType !== "gpts" && isReadyToChat && subscription

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
        <Button
          ref={toggleButtonRef}
          className={cn(
            `absolute left-[16px] ${showSidebar && isMobile ? "top-1/2" : "top-3"} z-20 size-[32px] cursor-pointer`
          )}
          style={{
            marginLeft: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
            transform: showSidebar ? "rotate(180deg)" : "rotate(0deg)"
          }}
          variant="ghost"
          size="icon"
          onClick={handleToggleSidebar}
        >
          <IconLayoutSidebarLeftExpand size={24} />
        </Button>
      )}

      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={handleOverlayClick}
        />
      )}

      <div
        className={cn(
          "bg-tertiary absolute z-50 h-full border-r-2 duration-200 lg:relative"
        )}
        style={contentType !== "gpts" ? sidebarStyle : undefined}
      >
        {showSidebar && (
          <Tabs
            className="flex h-full"
            value={contentType}
            onValueChange={tabValue => {
              setContentType(tabValue as ContentType)
              router.replace(`${pathname}?tab=${tabValue}`)
            }}
          >
            <SidebarSwitcher
              onContentTypeChange={setContentType}
              handleToggleSidebar={handleToggleSidebar}
            />
            {contentType !== "gpts" && (
              <Sidebar contentType={contentType} showSidebar={showSidebar} />
            )}
          </Tabs>
        )}
      </div>

      <div
        className={cn(
          "bg-background flex grow flex-col",
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
