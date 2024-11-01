import { z } from "zod"
import { StreamData } from "ai"

type ToolContext = {
  profile: { user_id: string }
  data: StreamData
  openai?: any
  messages?: any
}

export const createToolSchemas = (context: ToolContext) => {
  const allSchemas = {
    // reasonLLM: {
    //   description:
    //     "Uses OpenAI's o1 model for advanced reasoning in complex scenarios.",
    //   parameters: z.object({
    //     reason: z
    //       .boolean()
    //       .describe(
    //         "Set to true to use the advanced reasoning engine for complex problems"
    //       )
    //   })
    // },
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
    terminal: {
      description: "Run terminal commands.",
      parameters: z.object({
        terminal: z
          .boolean()
          .describe(
            "Set to true to use the terminal for executing bash commands"
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
