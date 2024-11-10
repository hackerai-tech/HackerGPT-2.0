import { toast } from "sonner"

const MAX_FILES = 4

export const handleFileUpload = (
  files: File[],
  setShowConfirmationDialog: (show: boolean) => void,
  setPendingFiles: (files: File[]) => void,
  handleSelectDeviceFile: (file: File) => void
) => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg"]
  const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv"]
  const supportedExtensions = [
    "csv",
    "json",
    "md",
    "pdf",
    "txt",
    "html",
    "htm",
    ...imageExtensions
  ]

  const unsupportedFiles: File[] = []

  if (files.length > MAX_FILES) {
    toast.error(`Maximum of ${MAX_FILES} files can be uploaded at once.`)
    return
  }

  files.forEach(file => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""

    if (videoExtensions.includes(fileExtension)) {
      toast.error(`${file.name}: Video files are not supported yet.`)
    } else if (fileExtension && !supportedExtensions.includes(fileExtension)) {
      unsupportedFiles.push(file)
    } else {
      handleSelectDeviceFile(file)
    }
  })

  if (unsupportedFiles.length > 0) {
    setPendingFiles(unsupportedFiles)
    setShowConfirmationDialog(true)
  }
}
