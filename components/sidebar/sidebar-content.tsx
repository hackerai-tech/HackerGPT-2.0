import { ContentType, DataListType } from "@/types"
import { FC, useContext, useState } from "react"
import { SidebarCreateButtons } from "./sidebar-create-buttons"
import { SidebarDataList } from "./sidebar-data-list"
import { PentestGPTContext } from "@/context/context"
import { SidebarUpgrade } from "./sidebar-upgrade"
import { SidebarInviteButton } from "./sidebar-invite-button"
import { InviteMembersDialog } from "../utility/invite-members-dialog"

interface SidebarContentProps {
  contentType: ContentType
  data: DataListType
}

export const SidebarContent: FC<SidebarContentProps> = ({
  contentType,
  data
}) => {
  const { isPremiumSubscription, setShowSidebar, isMobile, subscription } =
    useContext(PentestGPTContext)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  const canInviteMembers = subscription?.quantity && subscription.quantity > 1

  const handleSidebarVisibility = () => {
    if (isMobile) {
      setShowSidebar(false)
    }
  }

  const handleInvite = () => {
    setIsInviteDialogOpen(true)
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

      {!isPremiumSubscription && <SidebarUpgrade />}

      {canInviteMembers && (
        <InviteMembersDialog
          isOpen={isInviteDialogOpen}
          onClose={() => setIsInviteDialogOpen(false)}
          teamName={subscription?.team_name || "Your Team"}
        />
      )}
    </div>
  )
}
