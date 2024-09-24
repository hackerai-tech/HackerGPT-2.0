import { ContentType, DataListType } from "@/types"
import { FC, useContext } from "react"
import { SidebarCreateButtons } from "./sidebar-create-buttons"
import { SidebarDataList } from "./sidebar-data-list"
import { PentestGPTContext } from "@/context/context"
import { SidebarUpgrade } from "./sidebar-upgrade"

interface SidebarContentProps {
  contentType: ContentType
  data: DataListType
}

export const SidebarContent: FC<SidebarContentProps> = ({
  contentType,
  data
}) => {
  const { subscription, setShowSidebar, isMobile } =
    useContext(PentestGPTContext)

  const handleSidebarVisibility = () => {
    if (isMobile) {
      setShowSidebar(false)
    }
  }

  return (
    <div className="flex max-h-[calc(100%-10px)] grow flex-col">
      <div className="flex items-center">
        <SidebarCreateButtons
          contentType={contentType}
          handleSidebarVisibility={handleSidebarVisibility}
        />
      </div>

      <SidebarDataList
        contentType={contentType}
        data={data}
        onChatSelect={handleSidebarVisibility}
      />

      {!subscription && <SidebarUpgrade />}
    </div>
  )
}
