import React from "react"
import { BrandLarge } from "@/components/ui/brand"

export const TemporaryChatInfo: React.FC = () => {
  return (
    <div className="text-center">
      <div className="mb-2">
        <BrandLarge />
      </div>
      <h2 className="mt-3 text-2xl font-semibold">Temporary Chat</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        This chat won&apos;t appear in history or be used to train our models.
      </p>
    </div>
  )
}
