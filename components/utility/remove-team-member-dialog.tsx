import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface RemoveTeamMemberDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  email: string
  isPendingInvitation: boolean
}

export function RemoveTeamMemberDialog({
  isOpen,
  onClose,
  onConfirm,
  email,
  isPendingInvitation
}: RemoveTeamMemberDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isPendingInvitation ? "Cancel Invitation" : "Remove Team Member"}
          </DialogTitle>
          <DialogDescription>
            {isPendingInvitation
              ? `Are you sure you want to cancel the invitation for ${email}? This action cannot be undone.`
              : `Are you sure you want to remove ${email} from the team? This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {isPendingInvitation ? "Cancel Invitation" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
