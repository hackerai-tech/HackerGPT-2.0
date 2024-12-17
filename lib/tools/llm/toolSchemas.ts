import { executeBrowserTool } from "./browser"
import { z } from "zod"

export const createToolSchemas = ({
  chatSettings,
  messages,
  profile,
  dataStream
}: {
  chatSettings?: any
  messages?: any
  profile?: any
  dataStream?: any
}) => {
  const allSchemas = {
    browser: {
      description:
        "Browse a webpage and extract its text content. For HTML retrieval or more complex web scraping, use the Python tool.",
      parameters: z.object({
        open_url: z.string().url().describe("The URL of the webpage to browse")
      }),
      execute: async ({ open_url }: { open_url: string }) => {
        return executeBrowserTool({
          open_url,
          config: { chatSettings, profile, messages, dataStream }
        })
      }
    },
    webSearch: {
      description: "Search the web for latest information",
      parameters: z.object({ search: z.boolean() })
    },
    terminal: {
      description:
        "Run terminal commands. Select this tool IMMEDIATELY when any terminal operations are needed.",
      parameters: z.object({
        terminal: z
          .boolean()
          .describe(
            "Set to true to use the terminal for executing bash commands. Select immediately when terminal operations are needed."
          )
      })
    },
    fragments: {
      description:
        "Creates a Next.js website or execute a python code based on your detailed specifications.",
      parameters: z.object({
        name: z
          .string()
          .describe("Name of the website/project or Python script"),
        description: z
          .string()
          .describe(
            "Detailed description of the website's purpose and requirements, or the Python script's functionality and goals"
          ),
        features: z
          .array(z.string())
          .describe(
            "List of specific features to include in the website or functionality to implement in Python"
          )
      })
    }
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
