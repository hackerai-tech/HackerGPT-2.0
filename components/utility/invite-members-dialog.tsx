import { PentestGPTContext } from "@/context/context"
import { inviteUserToTeam } from "@/db/teams"
import { DialogPanel, DialogTitle } from "@headlessui/react"
import { IconUserPlus, IconX } from "@tabler/icons-react"
import { FC, useContext, useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { TransitionedDialog } from "../ui/transitioned-dialog"
import { useUIContext } from "@/context/ui-context"

interface InviteMembersDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const InviteMembersDialog: FC<InviteMembersDialogProps> = ({
  isOpen,
  onClose
}) => {
  const { teamMembers, refreshTeamMembers } = useContext(PentestGPTContext)
  const { isMobile } = useUIContext()
  const [email, setEmail] = useState("")

  const handleInvite = async () => {
    if (!teamMembers || teamMembers.length === 0) {
      toast.error("No team selected")
      return
    }
    try {
      await inviteUserToTeam(
        teamMembers[0].team_id,
        teamMembers[0].team_name,
        email
      )
      await refreshTeamMembers()

      toast.success(`Invitation sent to ${email}`)
      setEmail("")
      onClose()
    } catch (error: any) {
      console.error("Error inviting user:", error)
      if (error.message === "User already has a team or pending invitation") {
        toast.error("This user already has a team or pending invitation")
      } else {
        toast.error("Failed to send invitation. Please try again.")
      }
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
            Invite Team Member
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
            Invite a new member to the {teamMembers?.[0]?.team_name} team
          </p>
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mb-4"
          />
          <Button onClick={handleInvite} className="w-full">
            <IconUserPlus size={20} className="mr-2" />
            Send Invitation
          </Button>
        </div>
      </DialogPanel>
    </TransitionedDialog>
  )
}
