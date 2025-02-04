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
        This chat won&apos;t appear in your history, and no data from these
        conversations will be stored or retained. To clear the chat, simply
        reload the page or click the &quot;Clear chat&quot; button.
      </p>
    </div>
  )
}
