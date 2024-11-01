import { Button } from "@/components/ui/button"
import { Dialog, DialogPanel } from "@headlessui/react"
import { FC, useState } from "react"
import { Label } from "../../ui/label"
import { SharedChatsPopup } from "./shared-chats-popup"

interface DataControlsTabProps {
  onDeleteAccount: () => void
}

export const DataControlsTab: FC<DataControlsTabProps> = ({
  onDeleteAccount
}) => {
  const [isSharedChatsPopupOpen, setIsSharedChatsPopupOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="space-y-4 ">
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
          <div className="flex flex-row justify-between">
            <div className="flex flex-col gap-2">
              <Label>Account Deletion</Label>
              <p className="text-muted-foreground text-sm">
                Warning: This action is irreversible. All your data will be
                permanently deleted.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={onDeleteAccount}
              className="w-[120px]"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>
      <Dialog
        open={isSharedChatsPopupOpen}
        onClose={() => setIsSharedChatsPopupOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="bg-popover max-h-[90vh] w-full max-w-4xl overflow-hidden overflow-y-auto rounded-2xl p-6 text-left align-middle shadow-xl transition-all">
            <SharedChatsPopup
              onClose={() => setIsSharedChatsPopupOpen(false)}
            />
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}
