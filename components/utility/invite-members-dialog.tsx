import { FC, useContext, useState } from "react"
import { DialogPanel, DialogTitle } from "@headlessui/react"
import { IconX, IconUserPlus } from "@tabler/icons-react"
import { PentestGPTContext } from "@/context/context"
import { TransitionedDialog } from "../ui/transitioned-dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/browser-client"

interface InviteMembersDialogProps {
  isOpen: boolean
  onClose: () => void
  teamName: string
  teamId: string
}

export const InviteMembersDialog: FC<InviteMembersDialogProps> = ({
  isOpen,
  onClose,
  teamName,
  teamId
}) => {
  const { isMobile } = useContext(PentestGPTContext)
  const [email, setEmail] = useState("")

  const handleInvite = async () => {
    try {
      const { data, error } = await supabase.rpc("invite_user_to_team", {
        p_team_id: teamId, // You'll need to pass the teamId as a prop or get it from context
        p_invitee_email: email
      })

      if (error) throw error

      toast.success(`Invitation sent to ${email}`)
      setEmail("")
      onClose()
    } catch (error: any) {
      console.error("Error inviting user:", error)
      toast.error(
        error.message || "Failed to send invitation. Please try again."
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
            Invite a new member to the {teamName} team
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
