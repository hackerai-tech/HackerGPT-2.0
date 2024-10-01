import { FC, useState } from "react"
import { Button } from "../../ui/button"
import { Label } from "../../ui/label"
import { SharedChatsPopup } from "./shared-chats-popup"

interface DataControlsTabProps {
  value: string
}

export const DataControlsTab: FC<DataControlsTabProps> = ({ value }) => {
  const [isSharedChatsPopupOpen, setIsSharedChatsPopupOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Shared links</Label>
        <Button
          variant="secondary"
          onClick={() => setIsSharedChatsPopupOpen(true)}
        >
          Manage
        </Button>
      </div>
      <SharedChatsPopup
        isOpen={isSharedChatsPopupOpen}
        onClose={() => setIsSharedChatsPopupOpen(false)}
      />
    </div>
  )
}
