import { FC, useState } from "react"
import { Button } from "../../ui/button"
import { InviteMembersDialog } from "../invite-members-dialog"
import {
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog"

interface TeamMember {
  id: number
  email: string
  joinedDate: string
  role: "Admin" | "Member"
}

interface TeamTabProps {
  value: string
  teamName: string
  isMobile: boolean
  teamMemberLimit: number
}

export const TeamTab: FC<TeamTabProps> = ({
  value,
  teamName,
  isMobile,
  teamMemberLimit
}) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const membersPerPage = 3

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: 1,
      email: "john@example.com",
      joinedDate: "2023-01-15T12:00:00Z",
      role: "Admin"
    },
    {
      id: 2,
      email: "jane@example.com",
      joinedDate: "2023-02-20T14:30:00Z",
      role: "Member"
    },
    {
      id: 3,
      email: "alice@example.com",
      joinedDate: "2023-03-10T09:15:00Z",
      role: "Member"
    },
    {
      id: 4,
      email: "bob@example.com",
      joinedDate: "2023-04-05T16:45:00Z",
      role: "Member"
    },
    {
      id: 5,
      email: "charlie@example.com",
      joinedDate: "2023-05-22T11:20:00Z",
      role: "Member"
    },
    {
      id: 6,
      email: "david@example.com",
      joinedDate: "2023-06-18T13:10:00Z",
      role: "Member"
    }
  ])

  const handleInvite = () => {
    setIsInviteDialogOpen(true)
  }

  const handleRemoveMember = (member: TeamMember) => {
    setMemberToRemove(member)
    setIsRemoveDialogOpen(true)
  }

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      setTeamMembers(
        teamMembers.filter(member => member.id !== memberToRemove.id)
      )
      setIsRemoveDialogOpen(false)
      setMemberToRemove(null)
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
  const currentMembers = teamMembers.slice(
    indexOfFirstMember,
    indexOfLastMember
  )

  const totalPages = Math.ceil(teamMembers.length / membersPerPage)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{teamName}</h2>
        <Button
          onClick={handleInvite}
          disabled={teamMembers.length >= teamMemberLimit}
          className="flex items-center"
          size="sm"
        >
          <UserPlus className="mr-2 size-4" />
          Invite
        </Button>
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold">
          Team Members ({teamMembers.length}/{teamMemberLimit})
        </h3>
        <ul className="space-y-1 rounded-lg p-2">
          {currentMembers.map(member => (
            <li
              key={member.id}
              className="flex items-center justify-between border-b py-1 last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium">{member.email}</p>
                <p className="text-muted-foreground text-xs">
                  Joined {formatDate(member.joinedDate)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${member.role === "Admin" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {member.role}
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
        teamName={teamName}
      />

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.email} from the
              team? This action cannot be undone.
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
