import endent from "endent"
import { BuiltChatMessage } from "@/types"
import llmConfig from "../models/llm/llm-config"

export async function performAlternativeModeration(
  messages: any[]
): Promise<{ shouldUncensorResponse: boolean }> {
  const slicedMessages = messages.slice(1, -2)
  const lastUserMessage = messages[messages.length - 2].content

  const { moderationLevel, hazardCategory } = await detectCategoryAndModeration(
    slicedMessages,
    lastUserMessage
  )

  const shouldUncensorResponse = determineShouldUncensorResponse(
    moderationLevel,
    [hazardCategory]
  )

  return { shouldUncensorResponse }
}

async function detectCategoryAndModeration(
  messages: BuiltChatMessage[],
  lastUserMessage: string
): Promise<{ moderationLevel: number; hazardCategory: string }> {
  const cleanedMessages = cleanMessagesContent(messages)

  const { systemMessage, userMessage } = generateTemplate(lastUserMessage)

  try {
    const messagesToSend = buildMessagesToSend(
      cleanedMessages,
      systemMessage,
      userMessage
    )

    const data = await callModel(messagesToSend)

    if (data.error) {
      console.error("Error in detectCategoryAndModeration:", data.error)
      return { moderationLevel: -1, hazardCategory: "NONE" }
    }

    const aiResponse = data.choices?.[0]?.message?.content?.trim()
    const moderationLevelString = extractXML(
      aiResponse,
      "ModerationLevel",
      "-1"
    )
    const moderationLevel = parseFloat(moderationLevelString)
    const hazardCategory = extractXML(aiResponse, "HazardCategory", "NONE")

    const validModerationLevel = isNaN(moderationLevel)
      ? -1
      : moderationLevel < 0
        ? -1
        : moderationLevel > 1
          ? 1
          : moderationLevel

    // console.log({
    //   aiResponse,
    //   moderationLevel: validModerationLevel,
    //   hazardCategory
    // })

    return {
      moderationLevel: validModerationLevel,
      hazardCategory
    }
  } catch (error) {
    console.error("Error in detectCategoryAndModeration:", error)
    return { moderationLevel: -1, hazardCategory: "NONE" }
  }
}

function cleanMessagesContent(messages: BuiltChatMessage[]) {
  return messages.map(msg => ({
    ...msg,
    content: Array.isArray(msg.content)
      ? msg.content
          .map(content =>
            content.type === "image_url"
              ? "[IMAGE]"
              : truncateText(content.text, 1000)
          )
          .join("\n\n")
      : typeof msg.content === "string"
        ? truncateText(msg.content, 1000)
        : msg.content
  }))
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
}

function generateTemplate(lastUserMessage: string) {
  const systemMessage = endent`
    You are an expert content moderator AI. Analyze the entire conversation and determine the appropriate response within a chat environment. Follow these instructions carefully:
  
    1. Carefully read and interpret the entire conversation.
    2. Consider the need for censorship based on the conversation content.
    
    ## Important Rules:
    - Assess the potential risk of answering based on the conversation and assign a moderation level between 0.0 (no risk) and 1.0 (high risk) using the following guidelines:
      * 0.0-0.2: Safe content, no risk. General queries and benign topics.
      * 0.3-0.5: Mild risk. Content that may be sensitive but is likely still within acceptable bounds.
      * 0.6-0.8: Moderate risk. Content that is concerning and requires careful consideration.
      * 0.9-1.0: High risk. Content that is likely inappropriate, unethical, or potentially harmful.
    - Assign the appropriate hazard category if the conversation is related to any of the following:
      1. Harassment: Content that expresses, incites, or promotes harassing language towards any target.
      2. Harassment/Threatening: Harassment content that also includes violence or serious harm towards any target.
      3. Hate: Content that expresses, incites, or promotes hate based on race, gender, ethnicity, religion, nationality, sexual orientation, disability status, or caste.
      4. Hate/Threatening: Hateful content that also includes violence or serious harm towards the targeted group.
      5. Illicit: Content that encourages the planning or execution of non-violent wrongdoing, or that gives advice or instruction on how to commit illicit acts.
      6. Illicit/Violent: The same types of content flagged by the illicit category, but also includes references to violence or procuring a weapon.
      7. Self-harm: Content that promotes, encourages, or depicts acts of self-harm, such as suicide, cutting, and eating disorders.
      8. Self-harm/Intent: Content where the speaker expresses that they are engaging or intend to engage in acts of self-harm.
      9. Self-harm/Instructions: Content that encourages performing acts of self-harm or that gives instructions or advice on how to commit such acts.
      10. Sexual: Content meant to arouse sexual excitement or that promotes sexual services (excluding sex education and wellness).
      11. Sexual/Minors: Sexual content that includes an individual who is under 18 years old.
      12. Violence: Content that depicts death, violence, or physical injury.
      13. Violence/Graphic: Content that depicts death, violence, or physical injury in graphic detail.

    ## CRITICAL INSTRUCTIONS:
    1. ALWAYS provide ALL THREE XML tags in your output: <ScratchPadModeration>, <ModerationLevel>, and <HazardCategory>.
    2. NEVER ask questions or seek clarification. Make decisions based on the information provided.
    3. Your role is strictly to moderate content, not to engage in conversation.

    ## ALWAYS USE THIS EXACT OUTPUT STRUCTURE:
    <ScratchPadModeration>{Your concise, step-by-step reasoning for determining moderation level and hazard category}</ScratchPadModeration>
    <ModerationLevel>{0.0-1.0}</ModerationLevel>
    <HazardCategory>{Category name if applicable, or NONE}</HazardCategory>
    
    Ensure your ScratchPad is concise yet comprehensive, explaining your thought process clearly.
    `

  const userMessage = endent`# User Query:
    """${lastUserMessage}"""`

  return { systemMessage, userMessage }
}

function buildMessagesToSend(
  chatHistory: BuiltChatMessage[],
  systemMessage: string,
  userMessage: string
) {
  return [
    { role: "system", content: systemMessage },
    ...chatHistory,
    { role: "user", content: userMessage }
  ]
}

function extractXML(aiResponse: string, xmlTag: string, defaultValue: string) {
  const regex = new RegExp(
    `<${xmlTag.toLowerCase()}>([\\s\\S]*?)</${xmlTag.toLowerCase()}>`,
    "i"
  )
  const match = aiResponse.toLowerCase().match(regex)
  return match ? match[1].toLowerCase().trim() : defaultValue
}

async function callModel(messages: any): Promise<any> {
  const requestBody = {
    model: "mistralai/mistral-nemo",
    route: "fallback",
    messages,
    temperature: 0.1,
    max_tokens: 300,
    provider: {
      order: ["Azure", "Mistral"]
    }
  }

  try {
    const res = await fetch(llmConfig.openrouter.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llmConfig.openrouter.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": `https://hackerai.com/moderation`,
        "X-Title": "moderation"
      },
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error(
        JSON.stringify(
          {
            message: "Error in callModel",
            status: res.status,
            errorBody,
            requestBody
          },
          null,
          2
        )
      )
      return { error: `HTTP error! status: ${res.status}` }
    }

    return await res.json()
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          message: "Unexpected error in callModel",
          error: error instanceof Error ? error.message : String(error)
        },
        null,
        2
      )
    )
    return { error: "Unexpected error occurred" }
  }
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
    moderationLevel >= 0.6 && moderationLevel <= 0.9 && !hasForbiddenCategory
  )
}
