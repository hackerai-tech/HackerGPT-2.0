import { toast } from "sonner"

const MAX_FILES = 4

export const handleFileUpload = (
  files: File[],
  setShowConfirmationDialog: (show: boolean) => void,
  setPendingFiles: (files: File[]) => void,
  handleSelectDeviceFile: (file: File) => void
) => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"]
  const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv"]
  const autoConvertExtensions = [
    "py",
    "js",
    "ts",
    "jsx",
    "tsx",
    "css",
    "scss",
    "html",
    "xml",
    "java",
    "cpp",
    "c",
    "cs",
    "go",
    "rb",
    "php",
    "sql",
    "sh",
    "yaml",
    "yml",
    "json",
    "env",
    "config"
  ]
  const standardTypes = [
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/json",
    "text/markdown",
    "application/pdf",
    "text/plain",
    "text/html"
  ]

  if (files.length > MAX_FILES) {
    toast.error(`Maximum of ${MAX_FILES} files can be uploaded at once.`)
    return
  }

  files.forEach(file => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""

    if (videoExtensions.includes(fileExtension)) {
      toast.error(`${file.name}: Video files are not supported yet.`)
    } else if (
      file.type.startsWith("image/") &&
      !imageExtensions.includes(fileExtension)
    ) {
      toast.error(
        `${file.name}: Only jpg, jpeg, png, gif, and webp images are supported.`
      )
    } else if (autoConvertExtensions.includes(fileExtension)) {
      // Auto-convert known text-based files
      handleSelectDeviceFile(file)
    } else if (
      !standardTypes.includes(file.type) &&
      !file.type.startsWith("image/")
    ) {
      // Show confirmation dialog for other non-standard files
      setPendingFiles([file])
      setShowConfirmationDialog(true)
    } else {
      // Handle standard files directly
      handleSelectDeviceFile(file)
    }
  })
}
