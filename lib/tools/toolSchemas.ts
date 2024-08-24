import { z } from "zod"
import { tool } from "ai"
import { executePythonCode } from "@/lib/tools/python-executor"
import { executeBashCommand } from "@/lib/tools/bash-executor"
import { generateAndUploadImage } from "@/lib/tools/image-generator"
import { StreamData } from "ai"

export const createToolSchemas = (context: {
  profile: any
  data: StreamData
}) => {
  let hasExecutedCode = false

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
    generateImage: tool({
      description: "Generates an image based on a text prompt.",
      parameters: z.object({
        prompt: z.string().describe("The text prompt for image generation"),
        width: z
          .number()
          .optional()
          .describe("Width (integer 256 to 1280, default: 512)"),
        height: z
          .number()
          .optional()
          .describe("Height (integer 256 to 1280, default: 512)")
      }),
      execute: async ({ prompt, width, height }) => {
        const generatedImage = await generateAndUploadImage({
          prompt,
          width,
          height,
          userId: context.profile.user_id
        })

        context.data.append({
          type: "imageGenerated",
          content: {
            url: generatedImage.url,
            prompt: prompt,
            width: width || 512,
            height: height || 512
          }
        })

        return `Image generated successfully. URL: ${generatedImage.url}`
      }
    }),
    python: tool({
      description: "Runs Python code.",
      parameters: z.object({
        pipInstallCommand: z
          .string()
          .describe(
            "Full pip install command to install packages (e.g., '!pip install package1 package2')"
          ),
        code: z
          .string()
          .describe("The Python code to execute in a single cell.")
      }),
      execute: async ({ pipInstallCommand, code }) => {
        if (hasExecutedCode) {
          return {
            results:
              "Code execution skipped. Only one code cell can be executed per request.",
            runtimeError: null
          }
        }

        hasExecutedCode = true
        const execOutput = await executePythonCode(
          context.profile.user_id,
          code,
          pipInstallCommand
        )
        const { results, error: runtimeError } = execOutput

        return {
          results,
          runtimeError
        }
      }
    }),
    terminal: tool({
      description: "Runs bash commands.",
      parameters: z.object({
        code: z.string().describe("The bash command to execute.")
      }),
      execute: async ({ code }) => {
        if (hasExecutedCode) {
          const errorMessage = `Skipped execution for: "${code}". Only one command can be run per request.`
          context.data.append({
            type: "stderr",
            content: `\n\`\`\`stderr\n${errorMessage}\n\`\`\``
          })
          return { stdout: "", stderr: errorMessage }
        }

        hasExecutedCode = true

        context.data.append({
          type: "terminal",
          content: `\n\`\`\`terminal\n${code}\n\`\`\``
        })

        const execOutput = await executeBashCommand(
          context.profile.user_id,
          code,
          context.data
        )

        return execOutput
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
