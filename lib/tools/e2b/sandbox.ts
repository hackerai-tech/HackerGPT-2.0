import { Sandbox, SandboxInfo } from "@e2b/code-interpreter"

export async function createOrConnectTerminal(
  userID: string,
  template: string,
  timeoutMs: number
): Promise<Sandbox> {
  const allSandboxes = await Sandbox.list()
  const sandboxInfo = allSandboxes.find(
    (sbx: SandboxInfo) =>
      sbx.metadata?.userID === userID && sbx.metadata?.template === template
  )

  if (!sandboxInfo) {
    try {
      return await Sandbox.create(template, {
        metadata: { template, userID },
        timeoutMs
      })
    } catch (e) {
      console.error("Error creating sandbox", e)
      throw e
    }
  }

  const sandbox = await Sandbox.connect(sandboxInfo.sandboxId)
  await sandbox.setTimeout(timeoutMs)
  return sandbox
}
