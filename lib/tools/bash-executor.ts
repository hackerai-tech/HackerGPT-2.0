import { CellMessage } from "@e2b/code-interpreter"
import { createOrConnectCodeInterpreter } from "./python-executor"
import { StreamData } from "ai"

const bashSandboxTimeout = 10 * 60 * 1000 // 10 minutes in ms
const template = "bash_sandbox"

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

  try {
    data.append({ type: "stdout", content: "\n```stdout\n" })
    const execution = await sbx.notebook.execCell(`!${command}`, {
      timeoutMs: 3 * 60 * 1000,
      onStdout: (out: CellMessage) => {
        stdoutAccumulator += out.toString()
        data.append({ type: "stdout", content: out.toString() })
      }
    })
    data.append({ type: "stdout", content: "\n```" })

    const stderrOutput = execution.logs.stderr.join("\n")
    if (stderrOutput.length > 0) {
      data.append({
        type: "stderr",
        content: `\n\`\`\`stderr\n${stderrOutput}\n\`\`\``
      })
    }

    return {
      stdout: stdoutAccumulator,
      stderr: stderrOutput
    }
  } finally {
    // TODO: This .close will be removed with the update to websocketless CodeInterpreter
    await sbx.close()
  }
}
