import { getAIProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"

import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

import { PluginID } from "@/types/plugins"
import { getSubscriptionInfo } from "@/lib/server/subscription-utils"
import { commandGeneratorHandler } from "@/lib/tools/tool-store/tools-handler"
import {
  isFreePlugin,
  isTerminalPlugin
} from "@/lib/tools/tool-store/tools-helper"
import { LargeModel, SmallModel } from "@/lib/models/llm/hackerai-llm-list"

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
  const { messages, payload, selectedPlugin, isTerminalContinuation } =
    json as {
      messages: any[]
      payload: any
      selectedPlugin: string
      isTerminalContinuation: boolean
    }

  try {
    const profile = await getAIProfile()
    const subscriptionInfo = await getSubscriptionInfo(profile.user_id)

    if (
      !isFreePlugin(selectedPlugin as PluginID) &&
      !subscriptionInfo.isPremium
    ) {
      return new Response(
        `Access Denied to ${selectedPlugin}: The plugin you are trying to use is exclusive to to Pro and Team members. Please upgrade to access this plugin.`
      )
    }

    const chatSettings = payload.chatSettings

    let ratelimitmodel
    if (chatSettings.model === SmallModel.modelId) {
      ratelimitmodel = "pentestgpt"
    } else if (chatSettings.model === LargeModel.modelId) {
      ratelimitmodel = "pentestgpt-pro"
    } else {
      ratelimitmodel = "gpt-4"
    }

    const terminalRateLimitCheck = await checkRatelimitOnApi(
      profile.user_id,
      "terminal",
      subscriptionInfo
    )
    if (terminalRateLimitCheck !== null) {
      return terminalRateLimitCheck.response
    }

    const rateLimitCheckResultForChatSettingsModel = await checkRatelimitOnApi(
      profile.user_id,
      ratelimitmodel,
      subscriptionInfo
    )
    if (rateLimitCheckResultForChatSettingsModel !== null) {
      return rateLimitCheckResultForChatSettingsModel.response
    }

    if (isTerminalPlugin(selectedPlugin as PluginID)) {
      return await commandGeneratorHandler({
        userID: profile.user_id,
        profile_context: profile.profile_context,
        messages,
        pluginID: selectedPlugin as PluginID,
        isTerminalContinuation: isTerminalContinuation,
        isPremium: subscriptionInfo.isPremium
      })
    }
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
