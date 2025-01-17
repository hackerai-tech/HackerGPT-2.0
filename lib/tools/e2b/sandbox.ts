import { Sandbox, SandboxInfo } from "@e2b/code-interpreter"
import { createClient } from "@supabase/supabase-js"
import { waitUntil } from "@vercel/functions"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createOrConnectTemporaryTerminal(
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

/**
 * Creates a new sandbox or connects to an existing one
 *
 * @param userID - The authenticated user's ID
 * @param template - The sandbox environment template to use
 * @param timeoutMs - Maximum time to wait for sandbox operations
 * @returns Promise<Sandbox> - The connected or created sandbox instance
 *
 * Flow:
 * 1. Look for existing sandbox less than 30 days old
 * 2. If found, try to resume it
 * 3. If resume fails or no sandbox exists, create new one
 * 4. Store sandbox details in database
 */
export async function createOrConnectPersistentTerminal(
  userID: string,
  template: string,
  timeoutMs: number
): Promise<Sandbox> {
  try {
    console.log(`[${userID}] Starting createOrConnectPersistentTerminal:
      - Template: ${template}
      - Timeout: ${timeoutMs}ms`)

    // Only check DB for persistent sandboxes
    console.log(`[${userID}] Looking for existing persistent sandbox`)
    const { data: existingSandbox } = await supabaseAdmin
      .from("e2b_sandboxes")
      .select("sandbox_id, status")
      .eq("user_id", userID)
      .eq("template", template)
      .gt(
        "updated_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .single()

    console.log(`[${userID}] Existing sandbox found:`, existingSandbox)

    if (existingSandbox?.sandbox_id) {
      let currentStatus = existingSandbox.status
      console.log(`[${userID}] Sandbox status: ${currentStatus}`)

      if (currentStatus === "pausing") {
        console.log(
          `[${userID}] Sandbox is pausing, waiting for pause completion`
        )
        for (let i = 0; i < 10; i++) {
          const { data: updatedSandbox } = await supabaseAdmin
            .from("e2b_sandboxes")
            .select("status")
            .eq("sandbox_id", existingSandbox.sandbox_id)
            .single()

          console.log(
            `[${userID}] Attempt ${i + 1}: Status = ${updatedSandbox?.status}`
          )

          if (updatedSandbox?.status === "paused") {
            currentStatus = "paused"
            break
          }

          await new Promise(resolve => setTimeout(resolve, 2000))
        }

        if (currentStatus === "pausing") {
          console.log(
            `[${userID}] Sandbox still pausing after timeout, creating new sandbox`
          )
          return await Sandbox.create(template, {
            timeoutMs,
            domain: "e2b-foxtrot.dev"
          })
        }
      }

      if (currentStatus === "active" || currentStatus === "paused") {
        try {
          console.log(
            `[${userID}] Attempting to resume sandbox ${existingSandbox.sandbox_id}`
          )
          const sandbox = await Sandbox.resume(existingSandbox.sandbox_id, {
            timeoutMs,
            domain: "e2b-foxtrot.dev"
          })

          await supabaseAdmin
            .from("e2b_sandboxes")
            .update({ status: "active" })
            .eq("sandbox_id", existingSandbox.sandbox_id)

          console.log(`[${userID}] Successfully resumed sandbox`)
          return sandbox
        } catch (e) {
          console.error(
            `[${userID}] Failed to resume sandbox ${existingSandbox.sandbox_id}:`,
            e
          )
        }
      }
    }

    // Create new persistent sandbox
    console.log(`[${userID}] Creating new persistent sandbox`)
    const sandbox = await Sandbox.create(template, {
      timeoutMs,
      domain: "e2b-foxtrot.dev"
    })

    console.log(`[${userID}] Created new sandbox: ${sandbox.sandboxId}`)
    await supabaseAdmin.from("e2b_sandboxes").upsert(
      {
        user_id: userID,
        sandbox_id: sandbox.sandboxId,
        template,
        status: "active"
      },
      {
        onConflict: "user_id,template"
      }
    )

    return sandbox
  } catch (error) {
    console.error(`[${userID}] Error in createOrConnectTerminal:`, error)
    throw error
  }
}

/**
 * Pauses an active sandbox
 *
 * @param sandbox - The sandbox instance to pause
 * @returns Promise<string | null> - The sandbox ID if successfully paused, null otherwise
 */
export async function pauseSandbox(sandbox: Sandbox): Promise<string | null> {
  if (!sandbox?.sandboxId) {
    console.log("Background: No sandbox ID provided for pausing")
    return null
  }

  console.log(`Background: Starting pause for sandbox ${sandbox.sandboxId}`)

  // Update status to pausing
  await supabaseAdmin
    .from("e2b_sandboxes")
    .update({ status: "pausing" })
    .eq("sandbox_id", sandbox.sandboxId)

  // Use waitUntil for the pause operation and status update
  waitUntil(
    sandbox
      .pause()
      .then(() => {
        console.log(
          `Background: Successfully paused sandbox ${sandbox.sandboxId}`
        )
        return supabaseAdmin
          .from("e2b_sandboxes")
          .update({ status: "paused" })
          .eq("sandbox_id", sandbox.sandboxId)
      })
      .catch(error => {
        console.error(
          `Background: Error pausing sandbox ${sandbox.sandboxId}:`,
          error
        )
        return supabaseAdmin
          .from("e2b_sandboxes")
          .update({ status: "active" })
          .eq("sandbox_id", sandbox.sandboxId)
      })
  )

  return sandbox.sandboxId
}
