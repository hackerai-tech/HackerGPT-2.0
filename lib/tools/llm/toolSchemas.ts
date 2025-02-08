import { executeWebSearchTool } from "./web-search"
import { executeTerminalTool } from "./terminal"
import { executeBrowserTool } from "./browser"
// import { executeFragments } from "../e2b/fragments/fragment-tool"
import { z } from "zod"
// import { executeCodingLLM } from "./cooding-llm"

export const createToolSchemas = ({
  chatSettings,
  messages,
  profile,
  dataStream,
  isTerminalContinuation
}: {
  chatSettings?: any
  messages?: any
  profile?: any
  dataStream?: any
  isTerminalContinuation?: boolean
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
      parameters: z.object({
        search: z.boolean().describe("Set to true to search the web")
      }),
      execute: async () => {
        return executeWebSearchTool({
          config: { chatSettings, messages, profile, dataStream }
        })
      }
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
      }),
      execute: async () => {
        return executeTerminalTool({
          config: {
            messages,
            profile,
            dataStream,
            isTerminalContinuation
          }
        })
      }
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
