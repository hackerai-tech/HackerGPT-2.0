import { Mistral } from "@mistralai/mistralai"
import llmConfig from "@/lib/models/llm/llm-config"

export async function performAlternativeModeration(
  messages: any[]
): Promise<{ shouldUncensorResponse: boolean }> {
  console.error("Performing alternative moderation")
  try {
    const relevantMessages = messages.slice(1, -1)
    if (relevantMessages.length === 0) {
      return { shouldUncensorResponse: false }
    }

    const mistral = new Mistral({
      apiKey: llmConfig.mistral.apiKey
    })

    const response = await mistral.classifiers.moderateChat({
      model: "mistral-moderation-latest",
      inputs: relevantMessages
    })

    if (
      !response.results?.[0]?.categories ||
      !response.results[0]?.categoryScores
    ) {
      return { shouldUncensorResponse: false }
    }

    const { categories, categoryScores } = response.results[0]

    const forbiddenCategories = [
      "sexual",
      "hate_and_discrimination",
      "violence_and_threats",
      "selfharm",
      "health",
      "financial",
      "law",
      "pii"
    ]

    const hasForbiddenContent = forbiddenCategories.some(
      category => categories[category] === true
    )

    const moderationLevel = Math.max(...Object.values(categoryScores))

    // console.log("Moderation results:", {
    //   moderationLevel,
    //   categoryScores,
    //   hasForbiddenContent,
    //   shouldUncensorResponse: moderationLevel >= 0.4 &&
    //                         moderationLevel <= 100 &&
    //                         !hasForbiddenContent
    // })

    return {
      shouldUncensorResponse:
        moderationLevel >= 0.4 && moderationLevel <= 100 && !hasForbiddenContent
    }
  } catch (error) {
    return { shouldUncensorResponse: false }
  }
}
