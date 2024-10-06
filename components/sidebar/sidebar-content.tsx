import { ContentType, DataListType } from "@/types"
import { FC, useContext, useState } from "react"
import { SidebarCreateButtons } from "./sidebar-create-buttons"
import { SidebarDataList } from "./sidebar-data-list"
import { PentestGPTContext } from "@/context/context"
import { SidebarUpgrade } from "./sidebar-upgrade"
import { SidebarInviteButton } from "./sidebar-invite-button"
import { InviteMembersDialog } from "@/components/utility/invite-members-dialog"
import { AcceptInvitationDialog } from "@/components/utility/accept-invitation-dialog"
import { isTeamAdmin } from "@/lib/team-utils"

interface SidebarContentProps {
  contentType: ContentType
  data: DataListType
}

export const SidebarContent: FC<SidebarContentProps> = ({
  contentType,
  data
}) => {
  const {
    isPremiumSubscription,
    setShowSidebar,
    isMobile,
    subscription,
    membershipData,
    teamMembers
  } = useContext(PentestGPTContext)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isAcceptInviteDialogOpen, setIsAcceptInviteDialogOpen] =
    useState(false)

  const isInvitationPending = membershipData?.invitation_status === "pending"
  const canInviteMembers =
    isTeamAdmin(membershipData) &&
    teamMembers &&
    teamMembers.length < (subscription?.quantity || 0)

  console.log(membershipData)

  const handleSidebarVisibility = () => {
    if (isMobile) {
      setShowSidebar(false)
    }
  }

  const handleInvite = () => {
    setIsInviteDialogOpen(true)
  }

  const handleAcceptInvitation = () => {
    setIsAcceptInviteDialogOpen(true)
  }

  return (
    <div className="flex max-h-[calc(100%-10px)] grow flex-col">
      <div className="flex items-center">
        <SidebarCreateButtons
          contentType={contentType}
          handleSidebarVisibility={handleSidebarVisibility}
        />
      </div>

      <SidebarDataList contentType={contentType} data={data} />

      {canInviteMembers && (
        <div className="mt-4">
          <SidebarInviteButton onInvite={handleInvite} />
        </div>
      )}
      {isInvitationPending && (
        <div className="mt-4">
          <SidebarInviteButton
            onInvite={handleAcceptInvitation}
            title="Accept Invitation"
            subtitle={`Join ${membershipData?.team_name} team.`}
          />
        </div>
      )}

      {!isPremiumSubscription && !isInvitationPending && <SidebarUpgrade />}

      {canInviteMembers && subscription?.team_id && (
        <InviteMembersDialog
          isOpen={isInviteDialogOpen}
          onClose={() => setIsInviteDialogOpen(false)}
        />
      )}

      {isInvitationPending && (
        <AcceptInvitationDialog
          isOpen={isAcceptInviteDialogOpen}
          onClose={() => setIsAcceptInviteDialogOpen(false)}
        />
      )}
    </div>
  )
}
