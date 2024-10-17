import OpenAI from "openai"

const MODERATION_CHAR_LIMIT = 3000

export async function getModerationResult(
  lastUserMessage: any,
  openaiApiKey: string
): Promise<{ shouldUncensorResponse: boolean }> {
  const openai = new OpenAI({ apiKey: openaiApiKey })

  let input: string | OpenAI.Moderations.ModerationCreateParams["input"]

  if (typeof lastUserMessage === "string") {
    input = lastUserMessage.slice(0, MODERATION_CHAR_LIMIT)
  } else if (lastUserMessage.content) {
    if (typeof lastUserMessage.content === "string") {
      input = lastUserMessage.content.slice(0, MODERATION_CHAR_LIMIT)
    } else if (Array.isArray(lastUserMessage.content)) {
      // Filter out only text and the first image
      input = lastUserMessage.content.reduce((acc: any[], item: any) => {
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
    } else {
      return { shouldUncensorResponse: false }
    }
  } else {
    return { shouldUncensorResponse: false }
  }

  try {
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: input
    })

    const result = moderation.results[0]
    const moderationLevel = calculateModerationLevel(result.category_scores)
    const hazardCategories = Object.entries(result.categories)
      .filter(([_, isFlagged]) => isFlagged)
      .map(([category, _]) => category)

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
    console.error("Error in getModerationResult:", error)
    return { shouldUncensorResponse: false }
  }
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
