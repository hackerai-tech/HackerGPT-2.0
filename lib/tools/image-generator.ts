import { createClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import { v4 as uuidv4 } from "uuid"

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ImageGenerationParams {
  prompt: string
  width?: number
  height?: number
  userId: string
}

export async function generateAndUploadImage({
  prompt,
  width = 512,
  height = 512,
  userId
}: ImageGenerationParams) {
  const imageApiUrl = process.env.IMAGE_API_URL
  const imageApiKey = process.env.IMAGE_API_KEY

  if (!imageApiUrl || !imageApiKey) {
    throw new Error("Image API configuration is missing")
  }

  const requestBody = {
    prompt,
    steps: 6,
    width,
    height,
    response_format: "url"
  }

  try {
    const response = await fetch(imageApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${imageApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      switch (response.status) {
        case 400:
          throw new Error(`Bad Request: Invalid parameters. ${errorBody}`)
        case 401:
          throw new Error("Unauthorized: Invalid API Key provided.")
        case 402:
          throw new Error("Payment Required: Quota exceeded.")
        case 404:
          throw new Error("Not Found: The requested resource doesn't exist.")
        case 429:
          throw new Error("Too Many Requests: Rate limit exceeded.")
        case 500:
          throw new Error(
            "Server Error: Something went wrong on the API's end."
          )
        default:
          throw new Error(
            `HTTP error! status: ${response.status}. Error Body: ${errorBody}`
          )
      }
    }

    const imageData = await response.json()

    const filename = uuidv4()
    const filePath = `${userId}/${filename}.jpg`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("message_images")
      .upload(filePath, await fetch(imageData.url).then(res => res.blob()), {
        cacheControl: "3600",
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    return {
      url: uploadData.path,
      prompt: imageData.prompt,
      originalUrl: imageData.url
    }
  } catch (error) {
    console.error("Error generating or uploading image:", error)
    throw error
  }
}
