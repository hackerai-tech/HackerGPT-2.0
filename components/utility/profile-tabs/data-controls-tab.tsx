import { FC, useState } from "react"
import { Dialog, DialogPanel } from "@headlessui/react"
import { Button } from "../../ui/button"
import { Label } from "../../ui/label"
import { SharedChatsPopup } from "./shared-chats-popup"

export const DataControlsTab: FC = () => {
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
