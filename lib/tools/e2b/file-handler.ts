import { createClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import { Sandbox } from "@e2b/code-interpreter"

interface FileUploadResult {
  success: boolean
  name: string
  path: string
  error?: string
}

interface BatchFileUploadResult {
  success: boolean
  uploadedFiles: FileUploadResult[]
  limitExceeded: boolean
}

export async function uploadFileToSandbox(
  fileId: string,
  sandbox: Sandbox,
  dataStream: any
): Promise<FileUploadResult> {
  let name = fileId
  try {
    const { content, name: fileName } = await getFileContentFromSupabase(fileId)
    name = fileName
    const sandboxPath = `/home/user/${name}`

    await sandbox.files.write(sandboxPath, content)

    dataStream.writeData({
      type: "text-delta",
      content: `📝 Uploaded ${name} to /home/user/\n`
    })

    return {
      success: true,
      name,
      path: sandboxPath
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("❌ File upload failed:", errorMessage)

    dataStream.writeData({
      type: "text-delta",
      content: `⚠️ Failed to upload ${name}: ${errorMessage}\n`
    })

    return {
      success: false,
      name,
      path: "",
      error: errorMessage
    }
  }
}

async function getFileContentFromSupabase(fileId: string) {
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // First get file metadata
  const { data: fileData, error: fileError } = await supabaseAdmin
    .from("files")
    .select("*")
    .eq("id", fileId)
    .single()

  if (fileError || !fileData) {
    console.error("❌ Failed to get file metadata:", fileError?.message)
    throw new Error(`Failed to get file metadata: ${fileError?.message}`)
  }

  // Then get actual file content from storage
  const { data: fileContent, error: storageError } = await supabaseAdmin.storage
    .from("files")
    .download(fileData.file_path)

  if (storageError) {
    console.error("❌ Failed to download file:", storageError.message)
    throw new Error(`Failed to download file: ${storageError.message}`)
  }

  const content = await fileContent.text()

  return {
    content,
    name: fileData.name
  }
}

export async function uploadFilesToSandbox(
  files: { fileId: string }[],
  sandbox: Sandbox,
  dataStream: any
): Promise<BatchFileUploadResult> {
  let filesToProcess = files

  if (files.length > 1) {
    dataStream.writeData({
      type: "text-delta",
      content:
        "⚠️ Warning: Maximum 3 files can be uploaded at once. Only the first 3 files will be processed.\n"
    })
    filesToProcess = files.slice(0, 3)
  }

  const results = []
  for (const fileRequest of filesToProcess) {
    const result = await uploadFileToSandbox(
      fileRequest.fileId,
      sandbox,
      dataStream
    )
    results.push(result)
  }

  return {
    success: results.every(r => r.success),
    uploadedFiles: results,
    limitExceeded: files.length > 3
  }
}
