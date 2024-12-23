import Image from "next/image"
import { FC } from "react"

interface ProfileButtonProps {
  imageUrl?: string
  onClick: () => void
  userEmail?: string
  showEmail?: boolean
  iconSize?: number
}

export const ProfileButton: FC<ProfileButtonProps> = ({
  imageUrl,
  onClick,
  userEmail,
  showEmail = false,
  iconSize = 32
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 hover:opacity-50 ${
        showEmail ? "hover:bg-accent -mb-2 rounded-lg p-2" : ""
      }`}
    >
      {imageUrl ? (
        <Image
          className={`rounded-full size-[${iconSize}px]`}
          src={imageUrl}
          height={iconSize}
          width={iconSize}
          alt="Profile"
          onError={e => {
            const target = e.target as HTMLImageElement
            target.style.display = "none"
            const icon = document.createElement("div")
            icon.innerHTML = `<IconSettings size={${iconSize}} />`
            target.parentNode?.appendChild(icon)
          }}
        />
      ) : (
        <div
          className={`bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-full font-bold`}
          style={{
            height: `${iconSize}px`,
            width: `${iconSize}px`,
            fontSize: `${iconSize * 0.4}px`
          }}
        >
          {userEmail?.[0]?.toUpperCase() || "S"}
        </div>
      )}
      {showEmail && <span className="truncate text-sm">{userEmail}</span>}
    </button>
  )
}
