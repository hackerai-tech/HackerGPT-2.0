import { Sandbox, SandboxInfo } from "@e2b/code-interpreter"
import { createClient } from "@supabase/supabase-js"
import { waitUntil } from "@vercel/functions"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Creates or connects to a temporary sandbox instance
 * Temporary sandboxes are destroyed after the session ends
 *
 * @param userID - User identifier for sandbox ownership
 * @param template - Sandbox environment template name
 * @param timeoutMs - Operation timeout in milliseconds
 * @returns Connected or newly created sandbox instance
 */
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
 * Creates or connects to a persistent sandbox instance
 * Persistent sandboxes are stored for up to 30 days
 *
 * @param userID - User identifier for sandbox ownership
 * @param template - Sandbox environment template name
 * @param timeoutMs - Operation timeout in milliseconds
 * @returns Connected or newly created sandbox instance
 *
 * Flow:
 * 1. Checks for existing sandbox in database (< 30 days old)
 * 2. If found with status "pausing", waits for pause completion
 * 3. If found with status "active"/"paused", attempts to resume
 * 4. If no valid sandbox found, creates new one
 * 5. Updates database with sandbox details
 */
export async function createOrConnectPersistentTerminal(
  userID: string,
  template: string,
  timeoutMs: number
): Promise<Sandbox> {
  try {
    // Only check DB for persistent sandboxes
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

    if (existingSandbox?.sandbox_id) {
      let currentStatus = existingSandbox.status

      if (currentStatus === "pausing") {
        for (let i = 0; i < 5; i++) {
          const { data: updatedSandbox } = await supabaseAdmin
            .from("e2b_sandboxes")
            .select("status")
            .eq("sandbox_id", existingSandbox.sandbox_id)
            .single()

          if (updatedSandbox?.status === "paused") {
            currentStatus = "paused"
            break
          }

          await new Promise(resolve => setTimeout(resolve, 5000))
        }

        if (currentStatus === "pausing") {
          throw new Error(
            "Sandbox pause operation timed out. Please try again later."
          )
        }
      }

      if (currentStatus === "active" || currentStatus === "paused") {
        try {
          const sandbox = await Sandbox.resume(existingSandbox.sandbox_id, {
            timeoutMs,
            domain: "e2b-foxtrot.dev"
          })

          await supabaseAdmin
            .from("e2b_sandboxes")
            .update({ status: "active" })
            .eq("sandbox_id", existingSandbox.sandbox_id)

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
    const sandbox = await Sandbox.create(template, {
      timeoutMs,
      domain: "e2b-foxtrot.dev"
    })

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
 * Initiates a background task to pause an active sandbox
 * Uses Vercel's waitUntil to handle the pause operation asynchronously
 *
 * @param sandbox - Active sandbox instance to pause
 * @returns sandboxId if pause initiated, null if invalid sandbox
 *
 * State Transitions:
 * 1. active -> pausing: Initial state update
 * 2. pausing -> paused: Successful pause
 * 3. pausing -> active: Failed pause (reverts)
 *
 * Note: The actual pause operation continues in the background
 * after this function returns
 */
export async function pauseSandbox(sandbox: Sandbox): Promise<string | null> {
  if (!sandbox?.sandboxId) {
    console.error("Background: No sandbox ID provided for pausing")
    return null
  }

  // Update status to pausing
  await supabaseAdmin
    .from("e2b_sandboxes")
    .update({ status: "pausing" })
    .eq("sandbox_id", sandbox.sandboxId)

  // Start background task and return immediately
  waitUntil(
    sandbox
      .pause()
      .then(async () => {
        await supabaseAdmin
          .from("e2b_sandboxes")
          .update({ status: "paused" })
          .eq("sandbox_id", sandbox.sandboxId)
      })
      .catch(async error => {
        console.error(
          `Background: Error pausing sandbox ${sandbox.sandboxId}:`,
          error
        )
        await supabaseAdmin
          .from("e2b_sandboxes")
          .update({ status: "active" })
          .eq("sandbox_id", sandbox.sandboxId)
      })
  )

  return sandbox.sandboxId
}
