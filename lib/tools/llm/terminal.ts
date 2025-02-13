import { buildSystemPrompt } from "@/lib/ai/prompts"
import { toVercelChatMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { createOpenAI } from "@ai-sdk/openai"
import { streamText, tool } from "ai"
import { z } from "zod"
import { executeTerminalCommand } from "./terminal-executor"
import {
  streamTerminalOutput,
  reduceTerminalOutput
} from "@/lib/ai/terminal-utils"
import { ratelimit } from "@/lib/server/ratelimiter"
import { epochTimeToNaturalLanguage } from "@/lib/utils"
import { Sandbox } from "@e2b/code-interpreter"
import {
  createOrConnectPersistentTerminal,
  createOrConnectTemporaryTerminal,
  pauseSandbox
} from "../e2b/sandbox"
import { uploadFilesToSandbox } from "@/lib/tools/e2b/file-handler"

const BASH_SANDBOX_TIMEOUT = 15 * 60 * 1000
const PERSISTENT_SANDBOX_TEMPLATE = "persistent-sandbox"
const TEMPORARY_SANDBOX_TEMPLATE = "temporary-sandbox"

interface TerminalToolConfig {
  messages: any[]
  profile: any
  dataStream: any
  isTerminalContinuation?: boolean
}

export async function executeTerminalTool({
  config
}: {
  config: TerminalToolConfig
}) {
  const { messages, profile, dataStream, isTerminalContinuation } = config
  let sandbox: Sandbox | null = null
  let persistentSandbox = false
  const userID = profile.user_id

  try {
    const rateLimitResult = await ratelimit(userID, "terminal")
    if (!rateLimitResult.allowed) {
      const waitTime = epochTimeToNaturalLanguage(
        rateLimitResult.timeRemaining!
      )
      dataStream.writeData({
        type: "error",
        content: `⚠️ You've reached the limit for terminal usage.\n\nTo ensure fair usage for all users, please wait ${waitTime} before trying again.`
      })
      return "Rate limit exceeded"
    }

    // Continue assistant message from previous terminal call
    const cleanedMessages = isTerminalContinuation
      ? messages.slice(0, -1)
      : messages

    const openai = createOpenAI()

    const { textStream, finishReason } = streamText({
      model: openai("gpt-4o", { parallelToolCalls: false }),
      temperature: 0.5,
      maxTokens: 2048,
      system: buildSystemPrompt(
        llmConfig.systemPrompts.pentestGPTTerminal,
        profile.profile_context
      ),
      messages: toVercelChatMessages(cleanedMessages, true),
      tools: {
        terminal: tool({
          description: "Execute commands in the sandbox environment.",
          parameters: z.object({
            command: z.string().describe("Command to execute"),
            usePersistentSandbox: z
              .boolean()
              .describe(
                "Use persistent sandbox (30-day storage) instead of temporary"
              ),
            files: z
              .array(
                z.object({
                  fileId: z.string().describe("ID of the file to upload")
                })
              )
              .max(3)
              .optional()
              .describe(
                "Files to upload to sandbox before executing command (max 3 files)"
              )
          }),
          execute: async ({ command, usePersistentSandbox, files = [] }) => {
            persistentSandbox = usePersistentSandbox

            dataStream.writeData({
              type: "sandbox-type",
              sandboxType: usePersistentSandbox
                ? "persistent-sandbox"
                : "temporary-sandbox"
            })

            // Create or connect to sandbox
            if (!sandbox) {
              sandbox = usePersistentSandbox
                ? await createOrConnectPersistentTerminal(
                    userID,
                    PERSISTENT_SANDBOX_TEMPLATE,
                    BASH_SANDBOX_TIMEOUT
                  )
                : await createOrConnectTemporaryTerminal(
                    userID,
                    TEMPORARY_SANDBOX_TEMPLATE,
                    BASH_SANDBOX_TIMEOUT
                  )
            }

            // Upload requested files
            if (files.length > 0) {
              await uploadFilesToSandbox(files, sandbox, dataStream)
            }

            // Execute command
            const terminalStream = await executeTerminalCommand({
              userID,
              command,
              usePersistentSandbox,
              sandbox
            })

            let terminalOutput = ""
            await streamTerminalOutput(terminalStream, chunk => {
              dataStream.writeData({
                type: "text-delta",
                content: chunk
              })
              terminalOutput += chunk
            })
            return reduceTerminalOutput(terminalOutput)
          }
        })
      },
      maxSteps: 2
    })

    for await (const chunk of textStream) {
      dataStream.writeData({
        type: "text-delta",
        content: chunk
      })
    }

    const finalFinishReason = await finishReason
    dataStream.writeData({ finishReason: finalFinishReason })
  } finally {
    // Pause sandbox at the end of the API request
    if (sandbox && persistentSandbox) {
      const persistentSandbox = sandbox as Sandbox
      await pauseSandbox(persistentSandbox)
    }
  }

  return "Terminal execution completed"
}
