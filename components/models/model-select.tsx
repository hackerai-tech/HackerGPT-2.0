import { PentestGPTContext } from "@/context/context"
import { LLM, LLMID } from "@/types"
import {
  IconCircle,
  IconCircleCheck,
  IconMessageOff
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState, useCallback } from "react"
import {
  useRouter,
  useSearchParams,
  useParams,
  usePathname
} from "next/navigation"
import { ModelIcon } from "./model-icon"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"

interface ModelSelectProps {
  selectedModelId: LLMID
  onSelectModel: (modelId: LLMID) => void
  onClose?: () => void
}

export const ModelSelect: FC<ModelSelectProps> = ({
  selectedModelId,
  onSelectModel,
  onClose
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const pathname = usePathname()
  const {
    isPremiumSubscription,
    profile,
    availableHostedModels,
    isTemporaryChat
  } = useContext(PentestGPTContext)

  const { handleNewChat } = useChatHandler()

  const handleToggleTemporaryChat = useCallback(
    (isTemporary: boolean) => {
      const newSearchParams = new URLSearchParams(searchParams)
      if (isTemporary) {
        if (pathname.includes("/chat/")) {
          const baseURL = `/${params.workspaceid}/chat`
          newSearchParams.set("temporary-chat", "true")
          router.push(`${baseURL}?${newSearchParams.toString()}`)
        } else {
          newSearchParams.set("temporary-chat", "true")
          router.push(`?${newSearchParams.toString()}`)
        }
      } else {
        newSearchParams.delete("temporary-chat")
        router.push(`?${newSearchParams.toString()}`)
        handleNewChat()
      }
      onClose?.()
    },
    [handleNewChat, searchParams, router, params, pathname, onClose]
  )

  const inputRef = useRef<HTMLInputElement>(null)

  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100) // FIX: hacky
    }
  }, [isOpen])

  const handleSelectModel = (modelId: LLMID) => {
    onSelectModel(modelId)
    setIsOpen(false)
  }

  const allModels = [...availableHostedModels]

  // Define the specific order of models
  const modelOrder: LLMID[] = [
    "gpt-4-turbo-preview",
    "mistral-large",
    "mistral-medium"
  ]

  // Sort the models based on the predefined order
  const sortedModels = allModels.sort((a, b) => {
    const indexA = modelOrder.indexOf(a.modelId as LLMID)
    const indexB = modelOrder.indexOf(b.modelId as LLMID)
    return indexA - indexB
  })

  // Group the sorted models by provider
  const groupedSortedModels = sortedModels.reduce<Record<string, LLM[]>>(
    (groups, model) => {
      const key = model.provider
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(model)
      return groups
    },
    {}
  )

  if (!profile) return null

  const handleUpgradeClick = () => {
    router.push("/upgrade")
  }

  const freeUserModels = [
    {
      modelId: "gpt-4-turbo-preview" as LLMID,
      modelName: "PentestGPT Pro",
      description: "Our smartest model & more",
      isUpgrade: true
    },
    {
      modelId: "mistral-medium" as LLMID,
      modelName: "PentestGPT",
      description: "Great for everyday tasks",
      provider: "mistral"
    }
  ]

  const modelDescriptions: Record<string, string> = {
    "gpt-4-turbo-preview": "Advanced model with tools",
    "mistral-large": "Uncensored, handles complex tasks",
    "mistral-medium": "Uncensored, everyday use"
  }

  return (
    <div className="flex size-full flex-col">
      <div className="space-y-1 overflow-y-auto p-3">
        {!isPremiumSubscription
          ? freeUserModels.map(model => (
              <div key={model.modelId}>
                <div
                  className="hover:bg-select flex cursor-pointer items-center justify-between space-x-2 rounded-md p-2"
                  onClick={() =>
                    model.isUpgrade
                      ? handleUpgradeClick()
                      : handleSelectModel(model.modelId)
                  }
                >
                  <div className="flex items-center space-x-2">
                    <ModelIcon modelId={model.modelId} size={28} />
                    <div>
                      <div className="text-sm font-medium">
                        {model.modelName}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {model.description}
                      </div>
                    </div>
                  </div>
                  {model.isUpgrade ? (
                    <Button variant="default" size="sm" className="h-7 text-xs">
                      Upgrade
                    </Button>
                  ) : selectedModelId === model.modelId ? (
                    <IconCircleCheck size={22} />
                  ) : (
                    <IconCircle size={22} className="text-muted-foreground" />
                  )}
                </div>
              </div>
            ))
          : Object.entries(groupedSortedModels).map(([provider, models]) => {
              const filteredModels = models

              if (filteredModels.length === 0) return null

              return (
                <div key={provider}>
                  <div className="space-y-2">
                    {filteredModels.map(model => (
                      <div
                        key={model.modelId}
                        className="hover:bg-accent flex w-full cursor-pointer items-center space-x-3 truncate rounded p-2"
                        onClick={() => handleSelectModel(model.modelId)}
                      >
                        <div className="flex min-w-0 flex-1 items-center space-x-3">
                          <ModelIcon modelId={model.modelId} size={28} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {model.modelName}
                            </div>
                            <div className="text-muted-foreground truncate text-xs">
                              {modelDescriptions[model.modelId] ||
                                "Advanced AI model"}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {selectedModelId === model.modelId ? (
                            <IconCircleCheck size={22} />
                          ) : (
                            <IconCircle size={22} className="opacity-50" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

        <div className="border-muted-foreground mx-2 my-4 border-t" />

        <div
          className="hover:bg-accent flex cursor-pointer items-center justify-between rounded-md p-2"
          onClick={() => handleToggleTemporaryChat(!isTemporaryChat)}
        >
          <div className="flex items-center space-x-2">
            <IconMessageOff size={24} />
            <span className="text-sm">Temporary chat</span>
          </div>
          <Switch
            checked={isTemporaryChat}
            onCheckedChange={handleToggleTemporaryChat}
            variant={"green"}
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  )
}
