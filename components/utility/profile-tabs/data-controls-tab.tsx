import { Button } from "@/components/ui/button"
import { FC, useState } from "react"
import { Label } from "../../ui/label"
import { SharedChatsPopup } from "./shared-chats-popup"

interface DataControlsTabProps {
  onDeleteAccount: () => void
  isDeleting?: boolean
}

export const DataControlsTab: FC<DataControlsTabProps> = ({
  onDeleteAccount,
  isDeleting = false
}) => {
  const [isSharedChatsPopupOpen, setIsSharedChatsPopupOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Shared links</Label>
          <Button
            variant="secondary"
            onClick={() => setIsSharedChatsPopupOpen(true)}
            className="w-[120px]"
          >
            Manage
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Delete account</Label>
            <Button
              variant="destructive"
              onClick={onDeleteAccount}
              disabled={isDeleting}
              className="w-[120px]"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
      <SharedChatsPopup
        isOpen={isSharedChatsPopupOpen}
        onClose={() => setIsSharedChatsPopupOpen(false)}
      />
    </div>
  )
}
