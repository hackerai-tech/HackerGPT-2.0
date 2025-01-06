import { FC } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface MFADisableModalProps {
  isOpen: boolean
  onClose: () => void
  onDisable: () => void
}

export const MFADisableModal: FC<MFADisableModalProps> = ({
  isOpen,
  onClose,
  onDisable
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Disable 2FA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your identity has been verified. Are you sure you want to disable
            two-factor authentication? This will make your account less secure.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDisable}>
              Disable 2FA
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
