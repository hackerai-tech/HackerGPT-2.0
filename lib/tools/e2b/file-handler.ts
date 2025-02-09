import { createClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import { Sandbox } from "@e2b/code-interpreter"

interface FileUploadResult {
  success: boolean
  name: string
  path: string
  error?: string
}

export async function uploadFileToSandbox(
  fileId: string,
  sandbox: Sandbox,
  dataStream: any
): Promise<FileUploadResult> {
  try {
    const { content, name } = await getFileContentFromSupabase(fileId)
    const sandboxPath = `/home/user/${name}`

    await sandbox.files.write(sandboxPath, content)

    dataStream.writeData({
      type: "text-delta",
      content: `📝 Uploaded ${name} to ${sandboxPath}\n`
    })

    return {
      success: true,
      name,
      path: sandboxPath
    }
  } catch (error) {
    console.error("❌ File upload failed:", error)
    dataStream.writeData({
      type: "text-delta",
      content: `⚠️ Failed to upload file ${fileId}: ${error}\n`
    })

    return {
      success: false,
      name: "",
      path: "",
      error: error instanceof Error ? error.message : String(error)
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
