import { OutputMessage, Sandbox } from "@e2b/code-interpreter"
import { CustomExecutionError } from "../tool-store/tools-terminal"
import { createOrConnectTerminal } from "../e2b/sandbox"

const BASH_SANDBOX_TIMEOUT = 15 * 60 * 1000
const MAX_EXECUTION_TIME = 5 * 60 * 1000
const ENCODER = new TextEncoder()

interface TerminalExecutorOptions {
  userID: string
  command: string
  template: "bash-terminal-v1"
}

export const terminalExecutor = async ({
  userID,
  command,
  template
}: TerminalExecutorOptions): Promise<ReadableStream<Uint8Array>> => {
  let sbx: Sandbox | null = null
  let hasTerminalOutput = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(ENCODER.encode(`\n\`\`\`terminal\n${command}\n\`\`\``))
      console.log(`[${userID}] Executing terminal command: ${command}`)

      try {
        sbx = await createOrConnectTerminal(
          userID,
          template,
          BASH_SANDBOX_TIMEOUT
        )

        if (!sbx) {
          throw new Error("Failed to create or connect to sandbox")
        }

        let isOutputStarted = false
        const execution = await sbx.runCode(command, {
          language: "bash",
          timeoutMs: MAX_EXECUTION_TIME,
          onStdout: (data: OutputMessage) => {
            hasTerminalOutput = true
            if (!isOutputStarted) {
              controller.enqueue(ENCODER.encode("\n```stdout\n"))
              isOutputStarted = true
            }
            controller.enqueue(ENCODER.encode(data.line))
          }
        })

        if (isOutputStarted) controller.enqueue(ENCODER.encode("\n```"))

        handleExecutionResult(execution, controller, userID, hasTerminalOutput)
      } catch (error) {
        handleError(error, controller, sbx, userID)
      } finally {
        controller.close()
      }
    }
  })

  return stream
}

function handleExecutionResult(
  execution: any,
  controller: ReadableStreamDefaultController,
  userID: string,
  hasTerminalOutput: boolean
) {
  if (!hasTerminalOutput) {
    if (execution.error) {
      console.error(`[${userID}] Execution error:`, execution.error)
      const errorMessage = execution.error.name.includes("TimeoutError")
        ? `Command timed out after ${MAX_EXECUTION_TIME / 1000} seconds. Try a shorter command or split it.`
        : `Execution failed: ${execution.error.value || "Unknown error"}`
      controller.enqueue(
        ENCODER.encode(`\n\`\`\`stderr\n${errorMessage}\n\`\`\``)
      )
    }

    const stderr = Array.isArray(execution.logs.stderr)
      ? execution.logs.stderr.join("\n")
      : execution.logs.stderr || ""
    if (stderr) {
      controller.enqueue(ENCODER.encode(`\n\`\`\`stderr\n${stderr}\n\`\`\``))
    }

    const stdout = Array.isArray(execution.logs.stdout)
      ? execution.logs.stdout.join("\n")
      : execution.logs.stdout || ""
    if (stdout) {
      controller.enqueue(ENCODER.encode(`\n\`\`\`stdout\n${stdout}\n\`\`\``))
    }
  }
}

function handleError(
  error: unknown,
  controller: ReadableStreamDefaultController,
  sbx: Sandbox | null,
  userID: string
) {
  console.error(`[${userID}] Error:`, error)
  let errorMessage = "An unexpected error occurred during execution."

  if (error instanceof CustomExecutionError) {
    errorMessage = error.value
  } else if (error instanceof Error) {
    if (isConnectionError(error)) {
      sbx?.kill()
      errorMessage =
        "The Terminal is currently unavailable. Our team is working on a fix. Please try again later."
    } else {
      errorMessage = error.message
    }
  }

  if (errorMessage.includes("Execution timed out")) {
    errorMessage = `Execution timed out after ${MAX_EXECUTION_TIME / 1000} seconds. Try a shorter command or split it.`
  }

  controller.enqueue(ENCODER.encode(`\n\`\`\`stderr\n${errorMessage}\n\`\`\``))
}

function isConnectionError(error: Error): boolean {
  return (
    (error.name === "TimeoutError" &&
      error.message.includes("Cannot connect to sandbox")) ||
    error.message.includes("503 Service Unavailable") ||
    error.message.includes("504 Gateway Timeout") ||
    error.message.includes("502 Bad Gateway")
  )
}
