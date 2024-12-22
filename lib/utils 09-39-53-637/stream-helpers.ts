import { createDataStreamResponse } from "ai"

export const handlePluginExecution = (
  executor: (dataStream: any) => Promise<void>
) => {
  return createDataStreamResponse({
    execute: executor,
    onError: error => {
      console.error(
        "Error occurred:",
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  })
}
