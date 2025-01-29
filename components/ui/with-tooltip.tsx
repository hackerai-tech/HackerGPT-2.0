import { FC } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./tooltip"

interface WithTooltipProps {
  display: React.ReactNode
  trigger: React.ReactNode
  delayDuration?: number
  side?: "left" | "right" | "top" | "bottom" | "bottomLeft" | "bottomRight"
}

export const WithTooltip: FC<WithTooltipProps> = ({
  display,
  trigger,
  delayDuration = 500,
  side = "right"
}) => {
  let tooltipSide: "left" | "right" | "top" | "bottom" = side as any
  let align: "start" | "center" | "end" = "center"

  if (side === "bottomLeft") {
    tooltipSide = "bottom"
    align = "start"
  } else if (side === "bottomRight") {
    tooltipSide = "bottom"
    align = "end"
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        {display && (
          <TooltipContent side={tooltipSide} align={align} sideOffset={5}>
            {display}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
