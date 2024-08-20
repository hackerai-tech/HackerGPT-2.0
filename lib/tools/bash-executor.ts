import { StreamData } from "ai"
import {
  CodeInterpreter,
  ProcessExitError,
  OutputMessage
} from "@e2b/code-interpreter"

const bashSandboxTimeout = 10 * 60 * 1000 // 10 minutes in ms
const template = "terminal-sbx"

export async function executeBashCommand(
  userID: string,
  command: string,
  data: StreamData
): Promise<{
  stdout: string
  stderr: string
}> {
  console.log(`[${userID}] Starting bash command execution: ${command}`)

  const sbx = await createOrConnectCodeInterpreter(
    userID,
    template,
    bashSandboxTimeout
  )

  let stdoutAccumulator = ""
  let isStdoutStarted = false
  let stderrAccumulator = ""

  try {
    const bashID = await sbx.notebook.createKernel({ kernelName: "bash" })

    await sbx.notebook.execCell(`${command}`, {
      kernelID: bashID,
      timeoutMs: 3 * 60 * 1000,
      onStdout: (out: OutputMessage) => {
        if (!isStdoutStarted) {
          data.append({ type: "stdout", content: "\n```stdout\n" })
          isStdoutStarted = true
        }
        stdoutAccumulator += out.line
        data.append({ type: "stdout", content: out.line })
      }
    })

    if (isStdoutStarted) {
      data.append({ type: "stdout", content: "\n```" })
    }

    return {
      stdout: stdoutAccumulator,
      stderr: stderrAccumulator
    }
  } catch (error) {
    if (error instanceof ProcessExitError) {
      const errorMessage = `\`\`\`stderr\n${error.stderr}\n\`\`\``
      data.append({ type: "stderr", content: errorMessage })
      stderrAccumulator = errorMessage
    } else {
      console.error("Error executing bash command", error)
    }

    return {
      stdout: stdoutAccumulator,
      stderr: stderrAccumulator
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
