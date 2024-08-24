import { StreamData } from "ai"
import {
  CodeInterpreter,
  ProcessExitError,
  OutputMessage
} from "@e2b/code-interpreter"

const bashSandboxTimeout = 10 * 60 * 1000
const template = "bash-terminal"
const maxExecutionTime = 3 * 60 * 1000

export async function executeBashCommand(
  userID: string,
  command: string,
  data: StreamData
): Promise<{ stdout: string; stderr: string }> {
  console.log(`[${userID}] Starting bash command execution: ${command}`)

  let sbx: CodeInterpreter | null = null
  let stdoutAccumulator = ""
  let isOutputStarted = false

  try {
    sbx = await createOrConnectTerminal(userID, template, bashSandboxTimeout)
    const bashID = await sbx.notebook.createKernel({ kernelName: "bash" })

    const execution = await sbx.notebook.execCell(command, {
      kernelID: bashID,
      timeoutMs: maxExecutionTime,
      onStdout: (out: OutputMessage) => {
        if (!isOutputStarted) {
          data.append({ type: "stdout", content: "\n```stdout\n" })
          isOutputStarted = true
        }
        stdoutAccumulator += out.line
        data.append({ type: "stdout", content: out.line })
      }
    })

    if (isOutputStarted) {
      data.append({ type: "stdout", content: "\n```" })
    }

    if (execution.error) {
      console.error(`[${userID}] Bash execution error:`, execution.error)
      if (execution.error.name.includes("TimeoutError")) {
        const timeoutMessage = `Command execution timed out after ${maxExecutionTime / 1000} seconds. Please try a shorter command or split your task into multiple commands.`
        data.append({
          type: "stderr",
          content: `\n\`\`\`stderr\n${timeoutMessage}\n\`\`\``
        })
        return { stdout: stdoutAccumulator, stderr: timeoutMessage }
      } else {
        // Handle other execution errors
        const errorMessage = `Command execution failed: ${execution.error.value || "Unknown error"}`
        data.append({
          type: "stderr",
          content: `\n\`\`\`stderr\n${errorMessage}\n\`\`\``
        })
        return { stdout: stdoutAccumulator, stderr: errorMessage }
      }
    }

    const stderr = Array.isArray(execution.logs.stderr)
      ? execution.logs.stderr.join("\n")
      : execution.logs.stderr || ""

    if (stderr) {
      data.append({
        type: "stderr",
        content: `\n\`\`\`stderr\n${stderr}\n\`\`\``
      })
    }

    return { stdout: stdoutAccumulator, stderr }
  } catch (error) {
    console.error(`[${userID}] Error executing bash command:`, error)
    let errorMessage: string

    if (error instanceof ProcessExitError) {
      errorMessage = error.stderr
    } else if (error instanceof Error) {
      if (
        (error.name === "TimeoutError" &&
          error.message.includes("Cannot connect to sandbox")) ||
        error.message.includes("503 Service Unavailable") ||
        error.message.includes("504 Gateway Timeout") ||
        error.message.includes("502 Bad Gateway")
      ) {
        if (sbx) {
          await sbx.kill()
        }
        errorMessage =
          "The Terminal is currently unavailable. The e2b.dev team is working on a fix. Please try again later."
      } else {
        errorMessage = error.message
      }
    } else {
      errorMessage =
        "An unexpected error occurred during bash command execution."
    }

    if (errorMessage.includes("Execution timed out")) {
      errorMessage = `Command execution timed out after ${maxExecutionTime / 1000} seconds. Please try a shorter command or split your task into multiple commands.`
    }

    data.append({
      type: "stderr",
      content: `\n\`\`\`stderr\n${errorMessage}\n\`\`\``
    })

    return { stdout: stdoutAccumulator, stderr: errorMessage }
  }
}

export async function createOrConnectTerminal(
  userID: string,
  template: string,
  timeoutMs: number
) {
  const allSandboxes = await CodeInterpreter.list()

  const sandboxInfo = allSandboxes.find(
    sbx =>
      sbx.metadata?.userID === userID && sbx.metadata?.template === template
  )

  if (!sandboxInfo) {
    // Vercel's AI SDK has a bug that it doesn't throw an error in the tool `execute` call so we want to be explicit
    try {
      const sbx = await CodeInterpreter.create(template, {
        metadata: {
          template,
          userID
        },
        timeoutMs: timeoutMs
      })

      return sbx
    } catch (e) {
      console.error("Error creating sandbox", e)
      throw e
    }
  }

  const sandbox = await CodeInterpreter.connect(sandboxInfo.sandboxId)
  await sandbox.setTimeout(timeoutMs)

  return sandbox
}
