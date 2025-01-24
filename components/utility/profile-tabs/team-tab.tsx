import { PentestGPTContext } from "@/context/context"
import { removeUserFromTeam } from "@/db/teams"
import { isTeamAdmin, ProcessedTeamMember, roleToLabel } from "@/lib/team-utils"
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  UserPlus
} from "lucide-react"
import { FC, useContext, useState } from "react"
import { toast } from "sonner"
import { Button } from "../../ui/button"
import { InviteMembersDialog } from "../invite-members-dialog"
import { RemoveTeamMemberDialog } from "../remove-team-member-dialog"
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react"

const membersPerPage = 5

export const TeamTab: FC = () => {
  const { teamMembers, subscription, refreshTeamMembers, membershipData } =
    useContext(PentestGPTContext)

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] =
    useState<ProcessedTeamMember | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const isAdmin = isTeamAdmin(membershipData)

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
        toast.success(
          memberToRemove.invitation_status === "pending"
            ? "Invitation cancelled successfully"
            : "Team member removed successfully"
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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshTeamMembers()
    setIsRefreshing(false)
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
        {isAdmin && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRefresh}
              className="flex items-center"
              size="sm"
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              onClick={handleInvite}
              disabled={
                (teamMembers?.length || 0) >= (subscription?.quantity || 0)
              }
              className="flex items-center"
              size="sm"
            >
              <UserPlus className="mr-2 size-4" />
              Invite
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {isAdmin && (
          <h3 className="text-base font-semibold">
            Team Members ({teamMembers?.length}/{subscription?.quantity})
          </h3>
        )}
        <ul className="space-y-1 rounded-lg p-2">
          {currentMembers?.map(member => (
            <li
              key={member.invitee_email}
              className="flex items-center justify-between border-b py-1 last:border-b-0"
            >
              <div className="mr-2 min-w-0 grow">
                <div className="scrollbar-hide overflow-x-auto">
                  <p className="whitespace-nowrap text-sm font-medium">
                    {member.invitee_email}
                  </p>
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {member.invitation_status === "accepted"
                    ? `Joined ${formatDate(member.invitation_updated_at)}`
                    : member.invitation_status === "pending"
                      ? "Pending"
                      : "Rejected"}
                </p>
              </div>
              <div className="flex shrink-0 items-center space-x-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    isTeamAdmin(member)
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {roleToLabel(member.member_role)}
                </span>
                {isAdmin && member.member_role !== "owner" && (
                  <Menu as="div" className="relative inline-block text-left">
                    <MenuButton className="flex items-center rounded-full p-1 hover:bg-gray-100">
                      <MoreHorizontal className="size-4 text-gray-500" />
                    </MenuButton>
                    <MenuItems className="ring/5 absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black focus:outline-none">
                      <div className="p-1">
                        <MenuItem>
                          {({ active }) => (
                            <button
                              className={`${
                                active
                                  ? "bg-gray-100 text-gray-900"
                                  : "text-gray-700"
                              } group flex w-full items-center rounded-md p-2 text-sm`}
                              onClick={() => handleRemoveMember(member)}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Remove
                            </button>
                          )}
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </Menu>
                )}
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

      <RemoveTeamMemberDialog
        isOpen={isRemoveDialogOpen}
        onClose={() => setIsRemoveDialogOpen(false)}
        onConfirm={confirmRemoveMember}
        email={memberToRemove?.invitee_email || ""}
        isPendingInvitation={memberToRemove?.invitation_status === "pending"}
      />
    </div>
  )
}
