import { StreamData } from "ai"
import {
  CodeInterpreter,
  ProcessExitError,
  OutputMessage
} from "@e2b/code-interpreter"

const bashSandboxTimeout = 10 * 60 * 1000
const template = "bash-terminal"

export async function executeBashCommand(
  userID: string,
  command: string,
  data: StreamData
): Promise<{
  stdout: string
  stderr: string
}> {
  console.log(`[${userID}] Starting bash command execution: ${command}`)

  let sbx: CodeInterpreter | null = null
  try {
    sbx = await createOrConnectCodeInterpreter(
      userID,
      template,
      bashSandboxTimeout
    )

    let stdoutAccumulator = ""
    let isStdoutStarted = false
    let stderrAccumulator = ""

    const bashID = await sbx.notebook.createKernel({ kernelName: "bash" })

    const execution = await sbx.notebook.execCell(`${command}`, {
      kernelID: bashID,
      timeoutMs: 3 * 60 * 1000,
      onStdout: (out: OutputMessage) => {
        if (!isStdoutStarted) {
          data.append({ type: "stdout", content: "\n```stdout\n" })
          isStdoutStarted = true
        }
        stdoutAccumulator += out.line
        data.append({ type: "stdout", content: out.line })
      },
      onStderr: (err: OutputMessage) => {
        stderrAccumulator += err.line
        data.append({
          type: "stderr",
          content: `\n\`\`\`stderr\n${err.line}\n\`\`\``
        })
      }
    })

    if (isStdoutStarted) {
      data.append({ type: "stdout", content: "\n```" })
    }

    if (execution.error) {
      console.error(`[${userID}] Bash execution error:`, execution.error)
      stderrAccumulator += `\nExecution error: ${execution.error}`
      data.append({
        type: "stderr",
        content: `\n\`\`\`stderr\nExecution error: ${execution.error}\n\`\`\``
      })
    }

    return {
      stdout: stdoutAccumulator,
      stderr: stderrAccumulator
    }
  } catch (error) {
    console.error(`[${userID}] Error executing bash command:`, error)
    let errorMessage =
      "An unexpected error occurred during bash command execution."

    if (error instanceof ProcessExitError) {
      errorMessage = error.stderr
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    data.append({
      type: "stderr",
      content: `\n\`\`\`stderr\n${errorMessage}\n\`\`\``
    })

    return {
      stdout: "",
      stderr: errorMessage
    }
  }
}

export async function createOrConnectCodeInterpreter(
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
