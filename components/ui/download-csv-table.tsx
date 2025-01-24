import { IconDownload } from "@tabler/icons-react"
import { useCallback } from "react"
import { WithTooltip } from "./with-tooltip"
import { useUIContext } from "@/context/ui-context"

interface TableData {
  headers: string[]
  rows: string[][]
}

export function DownloadCSVTable() {
  const { isGenerating } = useUIContext()

  const getTableData = useCallback((): TableData => {
    const headers = Array.from(document.querySelectorAll("table th")).map(
      header => header.textContent?.trim() || ""
    )

    const rows = Array.from(document.querySelectorAll("table tr"))
      .map(row =>
        Array.from(row.querySelectorAll("td")).map(
          cell => cell.textContent?.trim() || ""
        )
      )
      .filter(row => row.length > 0)

    return { headers, rows }
  }, [])

  const escapeCSVCell = useCallback((cell: string): string => {
    // If cell contains comma, quotes, or newlines, wrap in quotes and escape existing quotes
    if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
      return `"${cell.replace(/"/g, '""')}"`
    }
    return cell
  }, [])

  const createFileName = useCallback((headers: string[]): string => {
    return (
      headers
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50)
        .replace(/-+$/, "") + ".csv"
    )
  }, [])

  const createCSVContent = useCallback(
    ({ headers, rows }: TableData): string => {
      const csvRows = [
        headers.map(escapeCSVCell).join(","),
        ...rows.map(row => row.map(escapeCSVCell).join(","))
      ]
      return csvRows.join("\n")
    },
    [escapeCSVCell]
  )

  const handleDownloadCSV = useCallback(() => {
    const tableData = getTableData()
    const filename = createFileName(tableData.headers)
    const csvContent = createCSVContent(tableData)

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)

    try {
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
    } finally {
      window.URL.revokeObjectURL(url)
    }
  }, [getTableData, createFileName, createCSVContent])

  if (isGenerating) return null

  return (
    <div className="-mb-2 flex w-full justify-end pr-2 pt-2">
      <WithTooltip
        delayDuration={0}
        side="bottomRight"
        display={"Download CSV"}
        trigger={<IconDownload size={18} onClick={handleDownloadCSV} />}
      />
    </div>
  )
}
