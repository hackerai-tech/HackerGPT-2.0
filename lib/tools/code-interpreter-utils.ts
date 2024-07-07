import "server-only"
import { CodeInterpreter } from "@e2b/code-interpreter"
import { ChatCompletionTool } from "openai/resources/chat/completions"
import llmConfig from "@/lib/models/llm/llm-config"
import endent from "endent"

const sandboxTimeout = 1 * 60 * 1000 // 1 minutes in ms
const template = "code-interpreter-stateful"

export const COMMAND_GENERATION_PROMPT = endent`
${llmConfig.systemPrompts.hackerGPT}
## Task Context:
- You are given tasks to complete, and you run Python code to solve them. The Python code runs in a Jupyter notebook.
- Every time you call the \`execute_python\` tool, the Python code is executed in a separate cell. It's okay to make multiple calls to \`execute_python\`.
- Display visualizations using matplotlib or any other visualization library directly in the notebook. Don't worry about saving the visualizations to a file.
- You have access to the internet and can make API requests.
- You also have access to the filesystem and can read/write files.
- You can install any pip package (if it exists) if you need to, but the usual packages for data analysis are already preinstalled.
- You can run any Python code you want; everything is running in a secure sandbox environment.
- Make sure the \`execute_python\` tool code is a correct JSON object.

## Style Guide:
- Tool response values that have text inside "[]" mean that a visual element got rendered in the notebook. For example:
  - "[chart]" means that a chart was generated in the notebook.
- Always include clear and concise comments in your code to explain what each section or important line does.`

export const CODE_INTERPRETER_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "execute_python",
      description:
        "Execute python code in a Jupyter notebook cell and returns any result, stdout, stderr, display_data, and error.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The python code to execute in a single cell."
          }
        },
        required: ["code"]
      }
    }
  }
]

export async function executeCode(
  sessionID: string,
  code: string,
  userID: string
): Promise<{
  results: any[]
  stdout: string
  stderr: string
  error: any
}> {
  const sandbox = await getSandbox(sessionID, userID)

  try {
    const execution = await sandbox.notebook.execCell(code, {
      timeout: 55000
    })

    if (execution.error) {
      console.error(`[${sessionID}] Execution error:`, execution.error)
    }

    return {
      results: execution.results,
      stdout: execution.logs.stdout.join("\n"),
      stderr: execution.logs.stderr.join("\n"),
      error: execution.error
    }
  } catch (error: any) {
    console.error(`[${sessionID}] Error in executeCode:`, error)
    const errorMessage = extractErrorMessage(error)

    return {
      results: [],
      stdout: "",
      stderr: "",
      error: {
        type: "ExecutionError",
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }
    }
  } finally {
    try {
      await sandbox.keepAlive(sandboxTimeout)
    } catch (keepAliveError) {
      console.warn(
        `[${sessionID}] Error keeping sandbox alive:`,
        keepAliveError
      )
    }
  }
}

export function extractErrorMessage(error: any): string {
  if (typeof error === "string") {
    return error
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "object" && error !== null) {
    if (error.message) {
      return error.message
    }
    if (error.value) {
      const match = error.value.match(
        /Max retries exceeded with url: \/ \(Caused by (.+)\)/
      )
      if (match) {
        return `Connection error: ${match[1]}`
      }
      return error.value
    }
  }
  return "An unknown error occurred"
}

export function truncateText(text: string, maxLength: number = 12000): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength) + "... (truncated)"
}

const sandboxCache = new Map<string, CodeInterpreter>()

async function getSandbox(
  sessionID: string,
  userID: string
): Promise<CodeInterpreter> {
  const E2B_API_KEY = process.env.E2B_API_KEY

  if (sandboxCache.has(sessionID)) {
    return sandboxCache.get(sessionID)!
  }

  const sandboxes = await CodeInterpreter.list()
  const existingSandbox = sandboxes.find(
    sandbox => sandbox.metadata?.sessionID === sessionID
  )

  let sandbox: CodeInterpreter
  if (existingSandbox) {
    sandbox = await CodeInterpreter.reconnect({
      sandboxID: existingSandbox.sandboxID,
      apiKey: E2B_API_KEY
    })
  } else {
    sandbox = await CodeInterpreter.create({
      template,
      apiKey: E2B_API_KEY,
      metadata: { sessionID, userID }
    })
  }

  sandboxCache.set(sessionID, sandbox)
  return sandbox
}

export async function closeSandbox(sessionID: string) {
  const sandbox = sandboxCache.get(sessionID)
  if (sandbox) {
    await sandbox.close().catch(console.error)
    sandboxCache.delete(sessionID)
  }
}