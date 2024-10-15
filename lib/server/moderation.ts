import OpenAI from "openai"

export async function getModerationResult(
  lastUserMessage: string,
  openaiApiKey: string
): Promise<{ moderationLevel: number; shouldUncensorResponse: boolean }> {
  const openai = new OpenAI({ apiKey: openaiApiKey })

  try {
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: lastUserMessage
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

    return { moderationLevel, shouldUncensorResponse }
  } catch (error: any) {
    // Check if the error is a 400 error with the specific message
    if (
      error.status === 400 &&
      error.error?.message?.includes("Input should be a valid string")
    ) {
      return { moderationLevel: 0, shouldUncensorResponse: false }
    }

    console.error("Error in getModerationResult:", error)
    return { moderationLevel: 0, shouldUncensorResponse: false }
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
