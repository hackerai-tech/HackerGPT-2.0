import { NextRequest, NextResponse } from "next/server"
import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import llmConfig from "@/lib/models/llm/llm-config"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"

const SUPPORTED_MIME_TYPES = [
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
]

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const OPENAI_API_URL = "https://api.openai.com/v1/audio/transcriptions"
const WHISPER_MODEL = "whisper-1"

export async function POST(req: NextRequest) {
  try {
    // Check authentication and subscription
    const profile = await getAIProfile()
    const subscriptionInfo = await getSubscriptionInfo(profile.user_id)

    if (!subscriptionInfo.isPremium) {
      return new NextResponse(
        "Access Denied: This feature requires a premium subscription",
        { status: 403 }
      )
    }

    // Check rate limit
    const rateLimitCheckResult = await checkRatelimitOnApi(
      profile.user_id,
      "stt-1",
      subscriptionInfo
    )
    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    // Get and validate audio file
    const formData = await req.formData()
    const audioFile = formData.get("audioFile")

    if (!audioFile || !(audioFile instanceof Blob)) {
      return new NextResponse("No audio file provided or invalid file type", {
        status: 400
      })
    }

    // Validate file type
    if (!SUPPORTED_MIME_TYPES.includes(audioFile.type)) {
      return new NextResponse(
        `Unsupported file type: ${audioFile.type}. Supported types: ${SUPPORTED_MIME_TYPES.join(", ")}`,
        { status: 400 }
      )
    }

    // Check file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return new NextResponse(
        `File size too large (${(audioFile.size / 1024 / 1024).toFixed(2)}MB). Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        { status: 400 }
      )
    }

    // Prepare OpenAI request
    const openaiFormData = new FormData()
    openaiFormData.append(
      "file",
      audioFile,
      `audio.${audioFile.type.split("/")[1]}`
    )
    openaiFormData.append("model", WHISPER_MODEL)
    openaiFormData.append("response_format", "text")
    openaiFormData.append(
      "prompt",
      "PentestGPT, Hackerone, Bugcrowd, Synack, Intigriti, HackTheBox, Burp Suite, TryHackMe, OWASP, CVE, XSS, CSRF, RCE, BeEF, 0day, Pwn, PrivEsc, PoC, IDS, IPS, WAF, OSINT, Subfinder, LinkFinder, Nuclei, CVEMap"
    )

    // Make request to OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llmConfig.openai.apiKey}`
      },
      body: openaiFormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })

      return new NextResponse(
        `Transcription service error: ${response.statusText}`,
        { status: response.status }
      )
    }

    // Process response
    const text = await response.text()
    const trimmedText = text.trim()

    if (!trimmedText) {
      return new NextResponse("No speech detected in the audio", {
        status: 400
      })
    }

    return new NextResponse(JSON.stringify({ text: trimmedText }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Speech to text error:", error)
    return new NextResponse(
      error instanceof Error
        ? `Speech to text error: ${error.message}`
        : "Internal server error",
      { status: 500 }
    )
  }
}
