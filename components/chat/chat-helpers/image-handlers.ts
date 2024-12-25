import { supabase } from "@/lib/supabase/browser-client"

export const fetchImageData = async (url: string) => {
  const { data, error } = await supabase.storage
    .from("message_images")
    .createSignedUrl(url, 60 * 60)

  if (error) {
    console.error(error)
    return null
  }

  return data?.signedUrl || null
}

export const bulkFetchImageData = async (urls: string[]) => {
  const { data, error } = await supabase.storage
    .from("message_images")
    .createSignedUrls(urls, 60 * 60)

  if (error) {
    console.error(error)
    throw new Error("Error fetching image data")
  }

  return data?.map(({ signedUrl, error }) => {
    if (error) {
      console.error(error)
      return null
    }
    return signedUrl
  })
}
