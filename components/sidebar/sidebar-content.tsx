import { ContentType, DataListType } from "@/types"
import { FC } from "react"
import { SidebarCreateButtons } from "./sidebar-create-buttons"
import { SidebarDataList } from "./sidebar-data-list"

interface SidebarContentProps {
  contentType: ContentType
  data: DataListType
}

export const SidebarContent: FC<SidebarContentProps> = ({
  contentType,
  data
}) => {
  return (
    <div className="flex max-h-[calc(100%-10px)] grow flex-col">
      <div className="flex items-center">
        <SidebarCreateButtons
          contentType={contentType}
          hasData={data.length > 0}
        />
      </div>

      <SidebarDataList contentType={contentType} data={data} />
    </div>
  )
}
