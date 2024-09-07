import { PentestGPTContext } from "@/context/context"
import { LLM, LLMID } from "@/types"
import { IconCircle, IconCircleCheck, IconLock } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { ModelOption } from "./model-option"
import { useRouter } from "next/navigation"
import { ModelIcon } from "./model-icon"
import { Button } from "../ui/button"

interface ModelSelectProps {
  selectedModelId: string
  onSelectModel: (modelId: LLMID) => void
}

export const ModelSelect: FC<ModelSelectProps> = ({
  selectedModelId,
  onSelectModel
}) => {
  const router = useRouter()
  const { subscription, profile, availableHostedModels } =
    useContext(PentestGPTContext)
  const isPremium = subscription !== null

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

  const sortedModels = [...allModels].sort((a, b) => {
    // Prioritize 'mistral' to appear first
    if (a.provider === "mistral" && b.provider !== "mistral") return -1
    if (b.provider === "mistral" && a.provider !== "mistral") return 1

    // Then prioritize 'openai'
    if (a.provider === "openai" && b.provider !== "openai") return -1
    if (b.provider === "openai" && a.provider !== "openai") return 1

    // Finally, sort alphabetically by provider name, or any other criteria you see fit
    return (
      a.provider.localeCompare(b.provider) ||
      a.modelName.localeCompare(b.modelName)
    )
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

  return (
    <div className="flex size-full flex-col">
      <div className="space-y-1 overflow-y-auto p-3">
        {!isPremium
          ? freeUserModels.map(model => (
              <div
                key={model.modelId}
                className="hover:bg-select flex cursor-pointer items-center justify-between space-x-2 rounded-md p-2"
                onClick={() =>
                  model.isUpgrade
                    ? handleUpgradeClick()
                    : handleSelectModel(model.modelId)
                }
              >
                <div className="flex items-center space-x-2">
                  <ModelIcon modelId={model.modelId} height={28} width={28} />
                  <div>
                    <div className="text-sm font-medium">{model.modelName}</div>
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
                  <IconCircleCheck size={24} />
                ) : (
                  <IconCircle size={24} className="text-muted-foreground" />
                )}
              </div>
            ))
          : Object.entries(groupedSortedModels).map(([provider, models]) => {
              const filteredModels = models

              if (filteredModels.length === 0) return null

              return (
                <div key={provider}>
                  <div className="">
                    {filteredModels.map(model => (
                      <div
                        key={model.modelId}
                        className="hover:bg-accent flex w-full cursor-not-allowed items-center justify-between space-x-3 truncate rounded p-1"
                        onClick={() => {
                          if (!isPremium && model.provider === "openai") {
                            handleUpgradeClick() // Show dialog for non-premium users trying to select an OpenAI model
                          } else if (
                            model.modelId === "mistral-large" &&
                            !isPremium
                          ) {
                            handleUpgradeClick() // Show dialog for non-premium users trying to select a Mistral Large model
                          } else {
                            handleSelectModel(model.modelId) // Allow selection for premium users or non-OpenAI models
                          }
                        }}
                      >
                        <ModelOption model={model} onSelect={() => {}} />
                        {selectedModelId === model.modelId ? (
                          <IconCircleCheck className="" size={28} />
                        ) : !isPremium &&
                          (model.provider === "openai" ||
                            model.modelId === "mistral-large") ? (
                          <IconLock className="opacity-50" size={28} />
                        ) : (
                          <IconCircle className="opacity-50" size={28} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
      </div>
    </div>
  )
}
