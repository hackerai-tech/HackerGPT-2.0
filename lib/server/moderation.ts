import OpenAI from "openai"
import { performAlternativeModeration } from "./alternative-moderation"

const MODERATION_CHAR_LIMIT = 1000

export async function getModerationResult(
  messages: any[],
  openaiApiKey: string,
  hackerRAGMinLength: number
): Promise<{ shouldUncensorResponse: boolean }> {
  const openai = new OpenAI({ apiKey: openaiApiKey })

  // Find the last user message that exceeds the minimum length
  const targetMessage = findTargetMessage(messages, hackerRAGMinLength)

  if (!targetMessage) {
    return { shouldUncensorResponse: false }
  }

  const input = prepareInput(targetMessage)

  try {
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: input
    })

    const result = moderation.results[0]
    const moderationLevel = calculateModerationLevel(result.category_scores)
    const hazardCategories = Object.entries(result.categories)
      .filter(([, isFlagged]) => isFlagged)
      .map(([category]) => category)

    const shouldUncensorResponse = determineShouldUncensorResponse(
      moderationLevel,
      hazardCategories
    )

    // console.log(
    //   JSON.stringify(moderation, null, 2),
    //   moderationLevel,
    //   hazardCategories,
    //   shouldUncensorResponse
    // )

    return { shouldUncensorResponse }
  } catch (error: any) {
    if (error.status === 429) {
      return await performAlternativeModeration(messages)
    }
    console.error("Error in getModerationResult:", error)
    return { shouldUncensorResponse: false }
  }
}

function findTargetMessage(messages: any[], minLength: number): any | null {
  let userMessagesChecked = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.role === "user") {
      userMessagesChecked++
      if (
        typeof message.content === "string" &&
        message.content.length > minLength
      ) {
        return message
      }
      if (userMessagesChecked >= 3) {
        break // Stop after checking three user messages
      }
    }
  }

  return null
}

function prepareInput(
  message: any
): string | OpenAI.Moderations.ModerationCreateParams["input"] {
  if (typeof message.content === "string") {
    return message.content.slice(0, MODERATION_CHAR_LIMIT)
  } else if (Array.isArray(message.content)) {
    return message.content.reduce((acc: any[], item: any) => {
      if (item.type === "text") {
        const truncatedText = item.text.slice(
          0,
          MODERATION_CHAR_LIMIT - acc.join("").length
        )
        if (truncatedText.length > 0) {
          acc.push({ ...item, text: truncatedText })
        }
      } else if (
        item.type === "image_url" &&
        !acc.some(i => i.type === "image_url")
      ) {
        acc.push(item)
      }
      return acc
    }, [])
  }
  return ""
}

function calculateModerationLevel(
  categoryScores: OpenAI.Moderations.Moderation.CategoryScores
): number {
  const maxScore = Math.max(...Object.values(categoryScores))
  return Math.min(Math.max(maxScore, 0), 1)
}

function determineShouldUncensorResponse(
  moderationLevel: number,
  hazardCategories: string[]
): boolean {
  const forbiddenCategories = [
    "sexual",
    "sexual/minors",
    "hate",
    "hate/threatening",
    "harassment",
    "harassment/threatening",
    "self-harm",
    "self-harm/intent",
    "self-harm/instruction",
    "violence",
    "violence/graphic"
  ]
  const hasForbiddenCategory = hazardCategories.some(category =>
    forbiddenCategories.includes(category)
  )

  return (
    moderationLevel >= 0.4 && moderationLevel <= 0.98 && !hasForbiddenCategory
  )
}
