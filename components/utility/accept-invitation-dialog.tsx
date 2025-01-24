import { PentestGPTContext } from "@/context/context"
import { acceptTeamInvitation, rejectTeamInvitation } from "@/db/teams"
import { DialogPanel, DialogTitle } from "@headlessui/react"
import { IconCheck, IconX } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { TransitionedDialog } from "../ui/transitioned-dialog"
import { useUIContext } from "@/context/ui-context"

interface AcceptInvitationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const AcceptInvitationDialog: FC<AcceptInvitationDialogProps> = ({
  isOpen,
  onClose
}) => {
  const { membershipData, refreshTeamMembers } = useContext(PentestGPTContext)
  const { isMobile } = useUIContext()

  const invitation = membershipData?.invitation_status === "pending"

  const handleAccept = async () => {
    if (!invitation) {
      toast.error("Invitation not found")
      return
    }

    try {
      await acceptTeamInvitation(membershipData?.invitation_id)
      await refreshTeamMembers()
      toast.success("Invitation accepted successfully")
      onClose()
    } catch (error: any) {
      console.error("Error accepting invitation:", error)
      toast.error(
        error.message || "Failed to accept invitation. Please try again."
      )
    }
  }

  const handleReject = async () => {
    if (!invitation) {
      toast.error("Invitation not found")
      return
    }

    try {
      await rejectTeamInvitation(membershipData?.invitation_id)
      await refreshTeamMembers()
      toast.success("Invitation rejected successfully")
      onClose()
    } catch (error: any) {
      console.error("Error rejecting invitation:", error)
      toast.error(
        error.message || "Failed to reject invitation. Please try again."
      )
    }
  }

  return (
    <TransitionedDialog isOpen={isOpen} onClose={onClose}>
      <DialogPanel
        className={`
          bg-popover overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all
          ${isMobile ? "w-full" : "w-full max-w-md"}
          max-h-[90vh] overflow-y-auto
        `}
      >
        <div className="mb-4 flex items-center justify-between">
          <DialogTitle className="text-xl font-medium leading-6">
            Accept Team Invitation
          </DialogTitle>
          <button
            onClick={onClose}
            className="hover:bg-muted rounded-full p-2 transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-muted-foreground mb-4">
            You have been invited to join the &quot;{membershipData?.team_name}
            &quot; team. Would you like to accept the invitation?
          </p>
          <Button onClick={handleAccept} className="mb-2 w-full">
            <IconCheck size={20} className="mr-2" />
            Accept Invitation
          </Button>
          <Button onClick={handleReject} className="w-full" variant="secondary">
            <IconX size={20} className="mr-2" />
            Reject Invitation
          </Button>
        </div>
      </DialogPanel>
    </TransitionedDialog>
  )
}
