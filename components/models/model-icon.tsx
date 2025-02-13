import { cn } from "@/lib/utils"
import { LLMID } from "@/types"
import { IconSparkles, IconBolt } from "@tabler/icons-react"
import { Sparkles, Sparkle } from "lucide-react"
import { useTheme } from "next-themes"
import { FC, HTMLAttributes } from "react"
import { GPT4o } from "@/lib/models/llm/openai-llm-list"
import { SmallModel, LargeModel } from "@/lib/models/llm/hackerai-llm-list"

interface ModelIconProps extends HTMLAttributes<HTMLDivElement> {
  modelId: LLMID | "custom"
  size: number
}

export const iconMap = {
  [GPT4o.modelId]: Sparkles,
  [SmallModel.modelId]: IconBolt,
  [LargeModel.modelId]: Sparkle,
  default: IconSparkles
}

export const ModelIcon: FC<ModelIconProps> = ({ modelId, size, ...props }) => {
  const { theme } = useTheme()
  const IconComponent = iconMap[modelId] || iconMap["default"]
  const className = cn(
    "rounded-sm bg-white p-0.5 text-black",
    props.className,
    theme === "dark" ? "bg-white" : "border border-black"
  )

  return <IconComponent className={className} size={size} />
}
