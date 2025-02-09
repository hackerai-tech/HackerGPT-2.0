import llmConfig from "@/lib/models/llm/llm-config"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export async function POST(request: Request) {
  const json = await request.json()
  const { userInput, fileIds, sourceCount } = json as {
    userInput: string
    fileIds: string[]
    sourceCount: number
  }

  const uniqueFileIds = [...new Set(fileIds)]

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    const { data: userFiles, error: userFilesError } = await supabaseAdmin
      .from("files")
      .select("id, name")
      .in("id", uniqueFileIds)
      .eq("user_id", profile.user_id)

    if (userFilesError) {
      throw new Error(
        `Failed to retrieve user files: ${userFilesError.message}`
      )
    }

    if (userFiles.length !== uniqueFileIds.length) {
      throw new Error("One or more files are not accessible by the user")
    }

    let chunks: any[] = []

    const openai = new OpenAI({
      apiKey: llmConfig.openai.apiKey
    })

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userInput
    })

    const openaiEmbedding = response.data.map(item => item.embedding)[0]

    const { data: openaiFileItems, error: openaiError } =
      await supabaseAdmin.rpc("match_file_items_openai", {
        query_embedding: openaiEmbedding as any,
        match_count: sourceCount,
        file_ids: uniqueFileIds
      })

    if (openaiError) {
      throw openaiError
    }

    chunks = openaiFileItems.map(item => {
      const file = userFiles.find(f => f.id === item.file_id)
      return {
        ...item,
        name: file?.name || null
      }
    })

    const mostSimilarChunks = chunks?.sort(
      (a, b) => b.similarity - a.similarity
    )

    return new Response(JSON.stringify({ results: mostSimilarChunks }), {
      status: 200
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
