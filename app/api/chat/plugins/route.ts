import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"

import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

import { PluginID } from "@/types/plugins"
import { isPremiumUser } from "@/lib/server/subscription-utils"
import { buildFinalMessages } from "@/lib/build-prompt"
import { commandGeneratorHandler } from "@/lib/tools/tool-store/tools-handler"
import {
  isFreePlugin,
  isTerminalPlugin
} from "@/lib/tools/tool-store/tools-helper"

export const runtime: ServerRuntime = "edge"
export const preferredRegion = [
  "iad1",
  "arn1",
  "bom1",
  "cdg1",
  "cle1",
  "cpt1",
  "dub1",
  "fra1",
  "gru1",
  "hnd1",
  "icn1",
  "kix1",
  "lhr1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1"
]

export async function POST(request: Request) {
  const json = await request.json()
  const { payload, chatImages, selectedPlugin } = json as {
    payload: any
    chatImages: any[]
    selectedPlugin: string
  }

  try {
    const profile = await getAIProfile()
    const isPremium = await isPremiumUser(profile.user_id)

    if (!isFreePlugin(selectedPlugin as PluginID) && !isPremium) {
      return new Response(
        `Access Denied to ${selectedPlugin}: The plugin you are trying to use is exclusive to Pro members. Please upgrade to a Pro account to access this plugin.`
      )
    }

    let chatSettings = payload.chatSettings

    let ratelimitmodel
    if (chatSettings.model === "mistral-medium") {
      ratelimitmodel = "pentestgpt"
    } else if (chatSettings.model === "mistral-large") {
      ratelimitmodel = "pentestgpt-pro"
    } else {
      ratelimitmodel = "gpt-4"
    }

    const terminalRateLimitCheck = await checkRatelimitOnApi(
      profile.user_id,
      "terminal"
    )
    if (terminalRateLimitCheck !== null) {
      return terminalRateLimitCheck.response
    }

    const rateLimitCheckResultForChatSettingsModel = await checkRatelimitOnApi(
      profile.user_id,
      ratelimitmodel
    )
    if (rateLimitCheckResultForChatSettingsModel !== null) {
      return rateLimitCheckResultForChatSettingsModel.response
    }

    const formattedMessages = (await buildFinalMessages(
      payload,
      profile,
      chatImages,
      selectedPlugin as PluginID
    )) as any

    if (isTerminalPlugin(selectedPlugin as PluginID)) {
      return await commandGeneratorHandler({
        userID: profile.user_id,
        profile_context: profile.profile_context,
        messages: formattedMessages,
        pluginID: selectedPlugin as PluginID
      })
    }
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
