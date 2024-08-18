import { CellMessage } from "@e2b/code-interpreter"
import { createOrConnectCodeInterpreter } from "./python-executor"
import { StreamData } from "ai"

const template = "bash_sandbox"

export async function executeBashCommand(
  userID: string,
  command: string,
  data: StreamData
): Promise<{
  stdout: string
  stderr: string
  error: string | null
}> {
  console.log(`[${userID}] Starting bash command execution: ${command}`)

  const sbx = await createOrConnectCodeInterpreter(userID, template)
  console.log(`[${userID}] Code interpreter connected for bash command`)

  let stdoutAccumulator = ""
  let stderrAccumulator = ""

  try {
    console.log(`[${userID}] Executing bash command`)
    data.append({ type: "stdout", content: "\n```stdout\n" }) // Opening delimiter
    const execution = await sbx.notebook.execCell(`!${command}`, {
      timeoutMs: 30000,
      onStdout: (out: CellMessage) => {
        console.log(`[${userID}] Bash stdout: ${out}`)
        stdoutAccumulator += out.toString()
        data.append({ type: "stdout", content: out.toString() })
      },
      onStderr: (err: CellMessage) => {
        console.error(`[${userID}] Bash stderr: ${err}`)
        stderrAccumulator += err.toString()
        data.append({ type: "stderr", content: err.toString() })
      }
    })
    data.append({ type: "stdout", content: "\n```" }) // Closing delimiter
    console.log(`[${userID}] Bash command execution completed`)

    const result = {
      stdout: stdoutAccumulator,
      stderr: stderrAccumulator,
      error: execution.error ? formatFullError(execution.error) : null
    }
    console.log(`[${userID}] Bash execution result:`, result)
    return result
  } catch (error: any) {
    console.error(`[${userID}] Error in executeBashCommand:`, error)
    return {
      stdout: stdoutAccumulator,
      stderr: stderrAccumulator,
      error: formatFullError(error)
    }
  } finally {
    console.log(`[${userID}] Closing code interpreter after bash command`)
    await sbx.close()
    console.log(`[${userID}] Code interpreter closed after bash command`)
  }
}

function formatFullError(error: any): string {
  console.log(`Formatting error:`, error)
  if (!error) return ""

  let output = ""
  if (error.name) output += `${error.name}: `
  if (error.value) output += `${error.value}\n\n`
  if (error.tracebackRaw && Array.isArray(error.tracebackRaw)) {
    output += error.tracebackRaw.join("\n")
  }
  console.log(`Formatted error:`, output)
  return output.trim()
}
