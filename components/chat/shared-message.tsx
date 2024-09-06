"use client"

import React from "react"
import { Tables } from "@/supabase/types"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { ModelIcon } from "../models/model-icon"
import { MessageTypeResolver } from "@/components/messages/message-type-solver"

const ICON_SIZE = 28

interface SharedMessageProps {
  message: Tables<"messages">
  previousMessage: Tables<"messages"> | undefined
  isLast: boolean
}

export const SharedMessage: React.FC<SharedMessageProps> = ({
  message,
  previousMessage,
  isLast
}) => {
  const modelDetails = LLM_LIST.find(model => model.modelId === message.model)

  return (
    <div className={cn("flex w-full justify-center")}>
      <div
        className={`relative flex w-full flex-col px-8 py-6 sm:w-[550px] sm:px-0 md:w-[650px] lg:w-[700px] 
          xl:w-[800px]
          ${isLast ? "mb-8" : ""}`}
      >
        <div className="flex space-x-3">
          {message.role === "assistant" && (
            <div className="shrink-0">
              <ModelIcon
                modelId={modelDetails?.modelId || "custom"}
                height={ICON_SIZE}
                width={ICON_SIZE}
              />
            </div>
          )}
          <div
            className={`min-w-0 grow ${message.role === "user" ? "flex justify-end" : ""}`}
          >
            <div>
              {message.image_paths.length > 0 && (
                <div className="mb-2 text-sm italic text-gray-600">
                  This message contains {message.image_paths.length} image
                  {message.image_paths.length > 1 ? "s" : ""}. Image sharing is
                  coming soon!
                </div>
              )}
              <MessageTypeResolver
                previousMessage={previousMessage}
                message={message}
                messageSizeLimit={12000}
                isLastMessage={isLast}
                toolInUse="none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
