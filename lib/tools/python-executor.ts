// import "server-only"
// import { CodeInterpreter } from "@e2b/code-interpreter"

// const pythonSandboxTimeout = 1 * 60 * 1000
// const template = "code-interpreter"

// export async function createOrConnectCodeInterpreter(
//   userID: string,
//   template: string,
//   timeoutMs: number
// ) {
//   const allSandboxes = await CodeInterpreter.list()

//   const sandboxInfo = allSandboxes.find(
//     sbx =>
//       sbx.metadata?.userID === userID && sbx.metadata?.template === template
//   )

//   if (!sandboxInfo) {
//     // Vercel's AI SDK has a bug that it doesn't throw an error in the tool `execute` call so we want to be explicit
//     try {
//       // const sbx = await CodeInterpreter.create(template, {
//       const sbx = await CodeInterpreter.create({
//         metadata: {
//           template,
//           userID
//         },
//         timeoutMs: timeoutMs
//       })

//       return sbx
//     } catch (e) {
//       console.error("Error creating sandbox", e)
//       throw e
//     }
//   }

//   const sandbox = await CodeInterpreter.connect(sandboxInfo.sandboxId)
//   await sandbox.setTimeout(timeoutMs)

//   return sandbox
// }

// export async function executePythonCode(
//   userID: string,
//   code: string,
//   pipInstallCommand: string | undefined
// ): Promise<{
//   results: string | null
//   stdout: string
//   stderr: string
//   error: string | null
// }> {
//   console.log(`[${userID}] Executing python code: ${code}`)
//   let sbx: CodeInterpreter | null = null

//   try {
//     sbx = await createOrConnectCodeInterpreter(
//       userID,
//       template,
//       pythonSandboxTimeout
//     )

//     if (pipInstallCommand && pipInstallCommand.trim().length > 0) {
//       const formattedPipCommand = pipInstallCommand
//         .trim()
//         .startsWith("!pip install")
//         ? pipInstallCommand
//         : `!pip install ${pipInstallCommand}`

//       console.log(`[${userID}] Installing packages: ${formattedPipCommand}`)
//       const installExecution = await sbx.notebook.execCell(
//         formattedPipCommand,
//         {
//           timeoutMs: 15000
//         }
//       )

//       if (installExecution.error) {
//         console.error(
//           `[${userID}] Package installation error:`,
//           installExecution.error
//         )
//       }
//     }

//     const execution = await sbx.notebook.execCell(code, {
//       timeoutMs: 60000
//     })

//     let formattedResults = null
//     if (execution.results && execution.results.length > 0) {
//       formattedResults = execution.results
//         .map(result => (result.text ? result.text : JSON.stringify(result)))
//         .join("\n")
//     }

//     return {
//       results: formattedResults,
//       stdout: execution.logs.stdout.join("\n"),
//       stderr: execution.logs.stderr.join("\n"),
//       error: execution.error ? formatError(execution.error) : null
//     }
//   } catch (error: any) {
//     console.error(`[${userID}] Python execution error:`, error)
//     let errorMessage: string

//     if (
//       error.name === "TimeoutError" &&
//       error.message.includes("Cannot connect to sandbox")
//     ) {
//       if (sbx) {
//         await sbx.kill()
//       }
//       errorMessage =
//         "The Python Code Interpreter is currently unavailable. The e2b.dev team is working on a fix. Please try again later."
//     } else {
//       errorMessage = formatError(error)
//     }

//     return {
//       results: null,
//       stdout: "",
//       stderr: "",
//       error: errorMessage
//     }
//   }
// }

// function formatError(error: any): string {
//   if (!error) return ""

//   const name = error.name || "Error"
//   const value = error.value || ""
//   const traceback =
//     error.tracebackRaw && Array.isArray(error.tracebackRaw)
//       ? error.tracebackRaw.join("\n")
//       : error.traceback || ""

//   return `${name}: ${value}\n\n${traceback}`.trim()
// }
