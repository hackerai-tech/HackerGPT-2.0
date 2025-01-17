import {
  ExecutionResultInterpreter,
  ExecutionResultWeb,
  Fragment
} from "./types"
import { createOrConnectTemporaryTerminal } from "../sandbox"

export async function executeFragment(
  fragment: Fragment,
  userID: string,
  sandboxTimeout: number
) {
  // Create a interpreter or a sandbox
  const sbx = await createOrConnectTemporaryTerminal(
    userID,
    fragment.template,
    sandboxTimeout
  )

  // Install packages
  if (fragment.has_additional_dependencies) {
    await sbx.commands.run(fragment.install_dependencies_command)
    // console.log(
    //   `Installed dependencies: ${fragment.additional_dependencies.join(", ")} in sandbox ${sbx.sandboxId}`
    // )
  }

  console.log(`[${userID}] Creating fragment: ${fragment.code}`)

  // Copy code to fs
  if (fragment.code && Array.isArray(fragment.code)) {
    fragment.code.forEach(async file => {
      await sbx.files.write(file.file_path, file.file_content)
      // console.log(`Copied file to ${file.file_path} in ${sbx.sandboxId}`)
    })
  } else {
    await sbx.files.write(fragment.file_path, fragment.code)
    // console.log(`Copied file to ${fragment.file_path} in ${sbx.sandboxId}`)
  }

  // Execute code or return a URL to the running sandbox
  if (fragment.template === "code-interpreter-v1") {
    const { logs, error, results } = await sbx.runCode(fragment.code || "")

    return {
      sbxId: sbx?.sandboxId,
      template: fragment.template,
      stdout: logs.stdout,
      stderr: logs.stderr,
      runtimeError: error,
      cellResults: results
    } as ExecutionResultInterpreter
  }

  return {
    sbxId: sbx?.sandboxId,
    template: fragment.template,
    url: `https://${sbx?.getHost(fragment.port || 80)}`
  } as ExecutionResultWeb
}
