import { PentestGPTContext } from "@/context/context"
import { removeUserFromTeam } from "@/db/teams"
import { ProcessedTeamMember, TeamRole } from "@/lib/team-utils"
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  UserPlus
} from "lucide-react"
import { FC, useContext, useState } from "react"
import { toast } from "sonner"
import { Button } from "../../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../ui/dropdown-menu"
import { InviteMembersDialog } from "../invite-members-dialog"

interface TeamTabProps {
  value: string
  isMobile: boolean
}

const membersPerPage = 5

export const TeamTab: FC<TeamTabProps> = ({ value, isMobile }) => {
  const { teamMembers, subscription, refreshTeamMembers } =
    useContext(PentestGPTContext)

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] =
    useState<ProcessedTeamMember | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const handleInvite = () => {
    setIsInviteDialogOpen(true)
  }

  const handleRemoveMember = (member: ProcessedTeamMember) => {
    setMemberToRemove(member)
    setIsRemoveDialogOpen(true)
  }

  const confirmRemoveMember = async () => {
    if (memberToRemove) {
      try {
        await removeUserFromTeam(
          memberToRemove.team_id,
          memberToRemove.invitee_email
        )
      } catch (error: any) {
        toast.error(error.message)
      } finally {
        await refreshTeamMembers()
        setIsRemoveDialogOpen(false)
        setMemberToRemove(null)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const indexOfLastMember = currentPage * membersPerPage
  const indexOfFirstMember = indexOfLastMember - membersPerPage
  const currentMembers = teamMembers?.slice(
    indexOfFirstMember,
    indexOfLastMember
  )

  const totalPages = Math.ceil((teamMembers?.length || 0) / membersPerPage)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{teamMembers?.[0]?.team_name}</h2>
        <Button
          onClick={handleInvite}
          disabled={(teamMembers?.length || 0) >= (subscription?.quantity || 0)}
          className="flex items-center"
          size="sm"
        >
          <UserPlus className="mr-2 size-4" />
          Invite
        </Button>
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold">
          Team Members ({teamMembers?.length}/{subscription?.quantity})
        </h3>
        <ul className="space-y-1 rounded-lg p-2">
          {currentMembers?.map(member => (
            <li
              key={member.invitee_email}
              className="flex items-center justify-between border-b py-1 last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium">{member.invitee_email}</p>
                <p className="text-muted-foreground text-xs">
                  {member.invitation_status === "accepted"
                    ? `Joined ${formatDate(member.invitation_updated_at)}`
                    : "Pending"}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${member.member_role === TeamRole.ADMIN || member.member_role === TeamRole.OWNER ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {member.member_role === TeamRole.ADMIN
                    ? "Admin"
                    : member.member_role === TeamRole.OWNER
                      ? "Owner"
                      : "Member"}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <MoreHorizontal className="size-4 text-gray-500" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => handleRemoveMember(member)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      <span>Remove</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
        {totalPages > 1 && (
          <div className="mt-2 flex items-center justify-end space-x-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() =>
                setCurrentPage(prev => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <InviteMembersDialog
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
      />

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.invitee_email}{" "}
              from the team? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveMember}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
