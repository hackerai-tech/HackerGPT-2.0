import { ServerRuntime } from "next"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import {
  buildFinalMessages,
  filterEmptyAssistantMessages
} from "@/lib/build-prompt"
import {
  replaceWordsInLastUserMessage,
  updateOrAddSystemMessage,
  wordReplacements
} from "@/lib/ai-helper"
import llmConfig from "@/lib/models/llm/llm-config"
import {
  executeCode,
  COMMAND_GENERATION_PROMPT,
  CODE_INTERPRETER_TOOLS
} from "@/lib/tools/code-interpreter-utils"
import OpenAI from "openai"
import endent from "endent"

export const runtime: ServerRuntime = "edge"

const openai = new OpenAI({
  apiKey: llmConfig.openai.apiKey
})

export async function POST(request: Request) {
  try {
    const { payload, chatImages, selectedPlugin } = await request.json()
    const profile = await getServerProfile()
    const sessionID = profile.user_id

    const rateLimitCheckResult = await checkRatelimitOnApi(
      profile.user_id,
      "gpt-4"
    )
    if (rateLimitCheckResult) return rateLimitCheckResult.response

    const cleanedMessages = await buildFinalMessages(
      payload,
      profile,
      chatImages,
      selectedPlugin
    )
    updateOrAddSystemMessage(cleanedMessages, COMMAND_GENERATION_PROMPT)
    filterEmptyAssistantMessages(cleanedMessages)
    replaceWordsInLastUserMessage(cleanedMessages, wordReplacements)
    const lastUserMessage = cleanedMessages[cleanedMessages.length - 1]
      .content as string

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: cleanedMessages as ChatCompletionCreateParamsBase["messages"],
      temperature: 0.4,
      max_tokens: 524,
      stream: true,
      tools: CODE_INTERPRETER_TOOLS,
      tool_choice: "auto"
    })

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of handleStream(
              stream,
              sessionID,
              lastUserMessage
            )) {
              controller.enqueue(new TextEncoder().encode(chunk))
            }
          } catch (error) {
            console.error("Error in stream processing:", error)
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify({ error: "Stream processing error" })
              )
            )
          } finally {
            controller.close()
          }
        }
      }),
      {
        headers: { "Content-Type": "text/plain" }
      }
    )
  } catch (error: any) {
    console.error("Error in API route:", error)
    return new Response(
      JSON.stringify({ error: "An error occurred", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}

async function* handleStream(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  sessionID: string,
  lastUserMessage: string
) {
  let partialToolCall: any = null

  for await (const chunk of stream) {
    const choice = chunk.choices[0]

    if (choice.delta.content) {
      // Stream regular content directly
      yield choice.delta.content
    } else if (choice.delta.tool_calls) {
      const toolCall = choice.delta.tool_calls[0]
      if (!partialToolCall)
        partialToolCall = { function: { name: "", arguments: "" } }
      partialToolCall.function.name =
        toolCall?.function?.name || partialToolCall.function.name
      partialToolCall.function.arguments += toolCall?.function?.arguments || ""

      if (isCompleteJsonObject(partialToolCall.function.arguments)) {
        if (partialToolCall.function.name === "execute_python") {
          yield* handlePythonExecution(
            partialToolCall,
            sessionID,
            lastUserMessage
          )
        }
        partialToolCall = null
      }
    }
  }
}

async function* handlePythonExecution(
  toolCall: any,
  sessionID: string,
  lastUserMessage: string
) {
  try {
    const parsedArgs = JSON.parse(toolCall.function.arguments)

    // Send code as JSON
    yield "\n" +
      JSON.stringify({ type: "code", content: parsedArgs.code }) +
      "\n"

    const results = await executeCode(sessionID, parsedArgs.code)
    // Send results as JSON
    yield JSON.stringify({
      type: "results",
      content: results.map(result => ({ text: result }))
    }) + "\n"

    // Stream explanation directly
    yield "\n" + JSON.stringify({ type: "explanation", content: "" }) + "\n"
    for await (const chunk of getAIExplanation(
      results,
      parsedArgs.code,
      lastUserMessage
    )) {
      yield chunk
    }
  } catch (error: any) {
    console.error("Error executing code:", error)
    yield JSON.stringify({
      type: "error",
      content: error.message
    }) + "\n"
  }
}

export async function* getAIExplanation(
  results: any[],
  code: string,
  lastUserMessage: any
): AsyncGenerator<string> {
  const explanationPrompt = endent`
    You are an AI assistant with code interpretation capabilities. You've just executed some Python code based on a user's request. Your task is to answer user's question or address their request with the code execution results.
    
    Context:
    1. User's last message: "${lastUserMessage}"
    2. Code executed:
    \`\`\`python
    ${code}
    \`\`\`
    3. Execution results:
    \`\`\`
    ${JSON.stringify(results, null, 2)}
    \`\`\`
  `

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: llmConfig.systemPrompts.hackerGPT },
        { role: "user", content: explanationPrompt }
      ],
      temperature: 0.4,
      max_tokens: 128,
      stream: true
    })

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content
      }
    }
  } catch (error) {
    console.error("Error in getAIExplanation:", error)
    yield "Failed to get AI explanation"
  }
}

function isCompleteJsonObject(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}
