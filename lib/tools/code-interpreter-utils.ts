import "server-only"
import { CodeInterpreter, Result } from "@e2b/code-interpreter"
import { ChatCompletionTool } from "openai/resources/chat/completions"

const E2B_API_KEY = process.env.E2B_API_KEY

const sandboxTimeout = 10 * 60 * 1000 // 10 minutes in ms
const template = "code-interpreter-stateful"

export const COMMAND_GENERATION_PROMPT = `
## your job & context
you are a python data scientist. you are given tasks to complete and you run python code to solve them.
- the python code runs in jupyter notebook.
- every time you call \`execute_python\` tool, the python code is executed in a separate cell. it's okay to multiple calls to \`execute_python\`.
- display visualizations using matplotlib or any other visualization library directly in the notebook. don't worry about saving the visualizations to a file.
- you have access to the internet and can make api requests.
- you also have access to the filesystem and can read/write files.
- you can install any pip package (if it exists) if you need to but the usual packages for data analysis are already preinstalled.
- you can run any python code you want, everything is running in a secure sandbox environment.

## style guide
tool response values that have text inside "[]"  mean that a visual element got rendered in the notebook. for example:
- "[chart]" means that a chart was generated in the notebook.
- Always include clear and concise comments in your code to explain what each section or important line does.
`

export const CODE_INTERPRETER_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "execute_python",
      description: "Execute Python code in a Jupyter notebook cell.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Python code to execute" }
        },
        required: ["code"]
      }
    }
  }
]

export async function executeCode(
  sessionID: string,
  code: string
): Promise<Result[]> {
  const sandbox = await getSandbox(sessionID)

  try {
    const execution = await sandbox.notebook.execCell(code, {
      onStderr: console.error,
      onStdout: console.log,
      timeout: 25000
    })

    if (execution.error) throw new Error(execution.error.value)
    return execution.results
  } finally {
    await sandbox.keepAlive(sandboxTimeout).catch(() => {})
    await sandbox.close()
  }
}

async function getSandbox(sessionID: string) {
  const sandboxes = await CodeInterpreter.list()
  const existingSandbox = sandboxes.find(
    sandbox => sandbox.metadata?.sessionID === sessionID
  )

  return existingSandbox
    ? await CodeInterpreter.reconnect({
        sandboxID: existingSandbox.sandboxID,
        apiKey: E2B_API_KEY
      })
    : await CodeInterpreter.create({
        template,
        apiKey: E2B_API_KEY,
        metadata: { sessionID }
      })
}
