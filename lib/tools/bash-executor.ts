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
): Promise<{ stdout: string; stderr: string }> {
  console.log(`[${userID}] Starting bash command execution: ${command}`)

  let sbx: CodeInterpreter | null = null
  let stdoutAccumulator = ""
  let isOutputStarted = false

  try {
    sbx = await createOrConnectCodeInterpreter(
      userID,
      template,
      bashSandboxTimeout
    )
    const bashID = await sbx.notebook.createKernel({ kernelName: "bash" })

    const execution = await sbx.notebook.execCell(command, {
      kernelID: bashID,
      timeoutMs: 3 * 60 * 1000,
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
    const errorMessage =
      error instanceof ProcessExitError
        ? error.stderr
        : error instanceof Error
          ? error.message
          : "An unexpected error occurred during bash command execution."

    data.append({
      type: "stderr",
      content: `\n\`\`\`stderr\n${errorMessage}\n\`\`\``
    })

    return { stdout: "", stderr: errorMessage }
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
