import { FC } from "react"
import { UserPlus } from "lucide-react"

interface SidebarInviteButtonProps {
  onInvite: () => void
}

export const SidebarInviteButton: FC<SidebarInviteButtonProps> = ({
  onInvite
}) => {
  return (
    <div className="mt-2">
      <div
        className="hover:bg-accent -mb-2 flex cursor-pointer flex-col items-start rounded px-1 py-2 hover:opacity-50"
        onClick={onInvite}
      >
        <div className="flex items-center">
          <UserPlus className="mr-2" size={24} />
          <div className="flex flex-col">
            <div className="text-sm font-semibold">Invite Members</div>
            <div className="text-muted-foreground mt-1 text-xs">
              Add team members to your team
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
