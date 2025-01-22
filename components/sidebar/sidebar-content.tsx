import { ContentType, DataListType } from "@/types"
import { FC, useContext, useEffect, useState } from "react"
import { SidebarDataList } from "./sidebar-data-list"
import { PentestGPTContext } from "@/context/context"
import { SidebarUpgrade } from "./sidebar-upgrade"
import { SidebarInviteButton } from "./sidebar-invite-button"
import { InviteMembersDialog } from "@/components/utility/invite-members-dialog"
import { AcceptInvitationDialog } from "@/components/utility/accept-invitation-dialog"
import { isTeamAdmin } from "@/lib/team-utils"
import { SidebarHeader } from "./sidebar-header"
import { SidebarSwitcher } from "./sidebar-switcher"
import { WithTooltip } from "../ui/with-tooltip"
import { Settings } from "../utility/settings"
import { useUIContext } from "@/context/ui-context"

export const SIDEBAR_ICON_SIZE = 26

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
    subscription,
    membershipData,
    teamMembers,
    setContentType
  } = useContext(PentestGPTContext)
  const { isMobile, setShowSidebar } = useUIContext()
  const isInvitationPending = membershipData?.invitation_status === "pending"

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isAcceptInviteDialogOpen, setIsAcceptInviteDialogOpen] =
    useState(isInvitationPending)

  useEffect(() => {
    setIsAcceptInviteDialogOpen(isInvitationPending)
  }, [isInvitationPending])

  // console.log(isAcceptInviteDialogOpen, membershipData, isInvitationPending)
  const canInviteMembers =
    isTeamAdmin(membershipData) &&
    teamMembers &&
    teamMembers.length < (subscription?.quantity || 0)

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

  const handleToggleSidebar = () => {
    setShowSidebar(false)
  }

  return (
    <div className="flex max-h-[calc(100%-10px)] grow flex-col">
      <SidebarHeader
        handleToggleSidebar={handleToggleSidebar}
        contentType={contentType}
        handleSidebarVisibility={handleSidebarVisibility}
      />

      <SidebarSwitcher onContentTypeChange={setContentType} />

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

      {isMobile && (
        <WithTooltip
          display={<div>Settings</div>}
          trigger={<Settings showEmail={true} />}
        />
      )}

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
