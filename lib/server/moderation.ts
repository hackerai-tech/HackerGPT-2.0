import endent from "endent"
import { BuiltChatMessage } from "@/types"
import llmConfig from "../models/llm/llm-config"

export async function detectCategoryAndModeration(
  messages: BuiltChatMessage[],
  lastUserMessage: string,
  openRouterUrl: string,
  openRouterHeaders: any
) {
  const { hackerRAG } = llmConfig

  if (lastUserMessage.length < hackerRAG.messageLength.min) {
    return { moderationLevel: 0, hazardCategory: "NONE" }
  } else if (lastUserMessage.length > hackerRAG.messageLength.max) {
    return { moderationLevel: 0, hazardCategory: "NONE" }
  }

  const cleanedMessages = cleanMessagesContent(messages)

  const { systemMessage, userMessage } = generateTemplate(lastUserMessage)

  try {
    const messagesToSend = buildMessagesToSend(
      cleanedMessages,
      systemMessage,
      userMessage
    )

    const data = await callModel(
      "mistralai/mistral-nemo",
      messagesToSend,
      openRouterUrl,
      openRouterHeaders
    )

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
    - Assess the potential risk of answering based on the conversation and assign a moderation level between 0.0 (no risk) and 1.0 (high risk) if it could lead to inappropriate or unethical use of information.
    - If the conversation is related to cybersecurity, consider lowering the risk level a little more than usual. 
    - Assign the appropriate hazard category if the conversation is related to any of the following:
      1. Sex-Related Crimes (S3): Content enabling, encouraging, or endorsing sex trafficking, sexual assault, sexual harassment, or prostitution.
      2. Child Sexual Exploitation (S4): Any content related to the sexual abuse of children.
      3. Indiscriminate Weapons (S9): Content related to chemical, biological, radiological, nuclear weapons, or high-yield explosives.
      4. Hate (S10): Responses that demean or dehumanize people on the basis of their sensitive, personal characteristics (i.e., race, color, ...)
      5. Suicide & Self-Harm (S11): Content enabling, encouraging, or endorsing suicide, self-injury, or disordered eating.
      6. Sexual Content (S12): Responses that contain erotica or explicit sexual content.

    ## CRITICAL INSTRUCTIONS:
    1. ALWAYS provide ALL THREE XML tags in your output: <ScratchPadModeration>, <ModerationLevel>, and <HazardCategory>.
    2. NEVER ask questions or seek clarification. Make decisions based on the information provided.
    3. Your role is strictly to moderate content, not to engage in conversation.

    ## ALWAYS USE THIS EXACT OUTPUT STRUCTURE:
    <ScratchPadModeration>{Your concise, step-by-step reasoning for determining moderation level and hazard category}</ScratchPadModeration>
    <ModerationLevel>{0.0-1.0}</ModerationLevel>
    <HazardCategory>{Category code if applicable, or NONE}</HazardCategory>
    
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

async function callModel(
  modelStandaloneQuestion: string,
  messages: any,
  openRouterUrl: string,
  openRouterHeaders: any
): Promise<any> {
  const requestBody = {
    model: modelStandaloneQuestion,
    route: "fallback",
    messages,
    temperature: 0.1,
    max_tokens: 300,
    ...(modelStandaloneQuestion === "mistralai/mistral-nemo" && {
      provider: {
        order: ["Azure", "Mistral"]
      }
    })
  }

  try {
    const res = await fetch(openRouterUrl, {
      method: "POST",
      headers: openRouterHeaders,
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
