"use client"

import React from "react"
import { Tables } from "@/supabase/types"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
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
    <div className="flex w-full space-x-3">
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
          {message.image_paths.map((path, index) => (
            <div
              key={index}
              className="mb-2 rounded bg-gray-200 p-2 text-sm italic text-gray-600"
            >
              Image {index + 1}
            </div>
          ))}
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
  )
}
