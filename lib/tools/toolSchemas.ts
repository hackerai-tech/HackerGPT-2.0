import { z } from "zod"
import { tool, StreamData } from "ai"
import { executePythonCode } from "@/lib/tools/python-executor"
// import { executeBashCommand } from "@/lib/tools/bash-executor"
import { generateAndUploadImage } from "@/lib/tools/image-generator"
// import { ratelimit } from "../server/ratelimiter"
// import { epochTimeToNaturalLanguage } from "../utils"

type ToolContext = {
  profile: { user_id: string }
  data: StreamData
}

export const createToolSchemas = (context: ToolContext) => {
  let executionPromise: Promise<void> | null = null

  const executeOnce = async <T>(
    toolName: string,
    command: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    if (executionPromise) {
      await executionPromise
      const errorMessage = `Execution skipped for: "${command}". Only one ${toolName} execution is allowed per message for now.`
      if (toolName === "terminal") {
        context.data.append({
          type: "terminal",
          content: `\n\`\`\`terminal\n${command}\n\`\`\``
        })
      }
      context.data.append({
        type: "stderr",
        content: `\n\`\`\`stderr\n${errorMessage}\n\`\`\``
      })
      return {
        results: errorMessage,
        runtimeError: null
      } as T
    }

    let resolve: () => void
    executionPromise = new Promise<void>(r => (resolve = r))

    try {
      return await fn()
    } finally {
      resolve!()
      executionPromise = null
    }
  }

  const allSchemas = {
    webSearch: {
      description: "Search the web for latest information",
      parameters: z.object({ search: z.boolean() })
    },
    browser: {
      description:
        "Browse a webpage and extract its text content. For HTML retrieval or more complex web scraping, use the Python tool.",
      parameters: z.object({
        open_url: z.string().url().describe("The URL of the webpage to browse")
      })
    },
    python: tool({
      description: "Runs Python code.",
      parameters: z.object({
        pipInstallCommand: z
          .string()
          .optional()
          .describe(
            "Full pip install command to install packages (e.g., '!pip install package1 package2')"
          ),
        code: z.string().min(1).describe("The Python code to execute")
      }),
      execute: async ({ pipInstallCommand, code }) => {
        return executeOnce("Python", code, async () => {
          const { results, error: runtimeError } = await executePythonCode(
            context.profile.user_id,
            code,
            pipInstallCommand
          )
          return { results, runtimeError }
        })
      }
    }),
    terminal: {
      description: "Runs bash commands.",
      parameters: z.object({
        command: z.string().min(1).describe("The bash command to execute")
      }),
      // execute: async ({ command }) => {
      //   return executeOnce("terminal", command, async () => {
      //     context.data.append({
      //       type: "terminal",
      //       content: `\n\`\`\`terminal\n${command}\n\`\`\``
      //     })

      //     const rateLimitResult = await ratelimit(
      //       context.profile.user_id,
      //       "terminal"
      //     )
      //     if (!rateLimitResult.allowed) {
      //       const waitTime = epochTimeToNaturalLanguage(
      //         rateLimitResult.timeRemaining!
      //       )
      //       const errorMessage = `Oops! It looks like you've reached the limit for terminal commands.\nTo ensure fair usage for all users, please wait ${waitTime} before trying again.`
      //       context.data.append({
      //         type: "stderr",
      //         content: `\n\`\`\`stderr\n${errorMessage}\n\`\`\``
      //       })
      //       return { stdout: "", stderr: errorMessage }
      //     }

      //     return await executeBashCommand(
      //       context.profile.user_id,
      //       command,
      //       context.data
      //     )
      //   })
      // }
    },
    generateImage: tool({
      description: "Generates an image based on a text prompt.",
      parameters: z.object({
        prompt: z
          .string()
          .min(1)
          .describe("The text prompt for image generation"),
        width: z.number().int().min(256).max(1280).optional().default(512),
        height: z.number().int().min(256).max(1280).optional().default(512)
      }),
      execute: async ({ prompt, width = 512, height = 512 }) => {
        const generatedImage = await generateAndUploadImage({
          prompt,
          width,
          height,
          userId: context.profile.user_id
        })
        context.data.append({
          type: "imageGenerated",
          content: { url: generatedImage.url, prompt, width, height }
        })
        return `Image generated successfully. URL: ${generatedImage.url}`
      }
    })
  }

  type SchemaKey = keyof typeof allSchemas

  return {
    allSchemas,
    getSelectedSchemas: (selectedPlugin: string | string[]) => {
      if (
        selectedPlugin === "all" ||
        !selectedPlugin ||
        selectedPlugin.length === 0
      ) {
        return allSchemas
      }
      if (typeof selectedPlugin === "string") {
        return selectedPlugin in allSchemas
          ? {
              [selectedPlugin as SchemaKey]:
                allSchemas[selectedPlugin as SchemaKey]
            }
          : {}
      }
      return Object.fromEntries(
        Object.entries(allSchemas).filter(([key]) =>
          selectedPlugin.includes(key)
        )
      )
    }
  }
}
