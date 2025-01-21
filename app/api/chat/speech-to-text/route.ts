import { NextRequest, NextResponse } from "next/server"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import llmConfig from "@/lib/models/llm/llm-config"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"

export async function POST(req: NextRequest) {
  const profile = await getAIProfile()
  const subscriptionInfo = await getSubscriptionInfo(profile.user_id)

  if (!subscriptionInfo.isPremium) {
    return new Response(
      "Access Denied: This feature is exclusive to Pro and Team members. Please upgrade your account to access the fragment tool.",
      { status: 403 }
    )
  }

  const rateLimitCheckResult = await checkRatelimitOnApi(
    profile.user_id,
    "stt-1",
    subscriptionInfo
  )
  if (rateLimitCheckResult !== null) {
    return rateLimitCheckResult.response
  }

  const formData = await req.formData()
  const audioFile = formData.get("audioFile")
  if (!audioFile || !(audioFile instanceof Blob)) {
    return new NextResponse(
      "No audio file provided or invalid file type. Please provide a valid audio file.",
      {
        status: 400
      }
    )
  }

  // Check file size
  const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
  if (audioFile.size > MAX_FILE_SIZE) {
    return new NextResponse("File size exceeds 25MB limit", { status: 400 })
  }

  if (
    ![
      "audio/flac",
      "audio/m4a",
      "audio/mp3",
      "audio/mp4",
      "audio/mpeg",
      "audio/mpga",
      "audio/oga",
      "audio/ogg",
      "audio/wav",
      "audio/webm"
    ].includes(audioFile.type)
  ) {
    console.error("Unsupported file type:", audioFile.type)
    return new NextResponse("Unsupported file type", { status: 400 })
  }

  const OPENAI_API_URL = "https://api.openai.com/v1/audio/transcriptions"
  const WHISPER_MODEL = "whisper-1"

  try {
    const arrayBuffer = await audioFile.arrayBuffer()

    const openaiFormData = new FormData()
    openaiFormData.append(
      "file",
      new Blob([arrayBuffer], { type: audioFile.type }),
      `audio.${audioFile.type.split("/")[1]}`
    )
    openaiFormData.append("model", WHISPER_MODEL)
    openaiFormData.append("response_format", "text")
    openaiFormData.append(
      "prompt",
      "PentestGPT, Hackerone, Bugcrowd, Synack, Intigriti, HackTheBox, Burp Suite, TryHackMe, OWASP, CVE, XSS, CSRF, RCE, BeEF, 0day, Pwn, PrivEsc, PoC, IDS, IPS, WAF, OSINT, Subfinder, LinkFinder, Nuclei, CVEMap"
    )
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llmConfig.openai.apiKey}`
      },
      body: openaiFormData
    })

    if (!response.ok) {
      const errorText = await response.text()

      console.error(`Failed to transcribe audio: ${response.statusText}`, {
        errorText: errorText,
        type: audioFile.type,
        size: arrayBuffer.byteLength,
        name: `audio.${audioFile.type.split("/")[1]}`
      })
      throw new Error(`Failed to transcribe audio: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type")
    let transcription
    if (contentType && contentType.includes("application/json")) {
      transcription = await response.json()
    } else {
      transcription = { text: await response.text() }
    }

    const trimmedText = transcription.text.trim()

    return new NextResponse(JSON.stringify({ text: trimmedText }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error processing speech to text:", error)
    return new NextResponse(
      error instanceof Error
        ? error.message
        : "Error processing speech to text",
      { status: 500 }
    )
  }
}
