"use client"

import { useState } from "react"
import { IconEye, IconEyeOff } from "@tabler/icons-react"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function PasswordInput() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <Input
        className="rounded-md border bg-inherit px-4 py-2 pr-10"
        type={showPassword ? "text" : "password"}
        name="password"
        placeholder="••••••••"
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <IconEyeOff size={20} className="text-muted-foreground" />
              ) : (
                <IconEye size={20} className="text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{showPassword ? "Hide password" : "Show password"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
