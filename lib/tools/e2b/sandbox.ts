import { Sandbox } from "@e2b/code-interpreter"
import { createClient } from "@supabase/supabase-js"
import { after } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
export async function createOrConnectTerminal(
  userID: string,
  template: string,
  timeoutMs: number
): Promise<Sandbox> {
  try {
    // Try to find an existing sandbox, including pausing ones
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

      // If sandbox is pausing, wait for it to complete
      if (currentStatus === "pausing") {
        // Wait for pause to complete (max 20 seconds)
        for (let i = 0; i < 10; i++) {
          const { data: updatedSandbox } = await supabaseAdmin
            .from("e2b_sandboxes")
            .select("status")
            .eq("sandbox_id", existingSandbox.sandbox_id)
            .single()

          if (updatedSandbox?.status === "paused") {
            currentStatus = "paused"
            break
          }

          await new Promise(resolve => setTimeout(resolve, 2000))
        }

        // If still pausing after timeout, create temporary sandbox
        if (currentStatus === "pausing") {
          return await Sandbox.create(template, {
            timeoutMs,
            domain: "e2b-foxtrot.dev"
          })
        }
      }

      // Try to resume if active or paused
      if (currentStatus === "active" || currentStatus === "paused") {
        try {
          const sandbox = await Sandbox.resume(existingSandbox.sandbox_id, {
            timeoutMs,
            domain: "e2b-foxtrot.dev"
          })

          // Update status to active
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

    // Create new sandbox if no existing one or resume failed
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
 * Pauses an active sandbox
 *
 * @param sandbox - The sandbox instance to pause
 * @returns Promise<string | null> - The sandbox ID if successfully paused, null otherwise
 */
export async function pauseSandbox(sandbox: Sandbox): Promise<string | null> {
  if (!sandbox?.sandboxId) return null

  // Update status to pausing
  await supabaseAdmin
    .from("e2b_sandboxes")
    .update({ status: "pausing" })
    .eq("sandbox_id", sandbox.sandboxId)

  after(async () => {
    try {
      await sandbox.pause()
      // Update status to paused
      await supabaseAdmin
        .from("e2b_sandboxes")
        .update({ status: "paused" })
        .eq("sandbox_id", sandbox.sandboxId)
    } catch (error) {
      console.error(
        `Background: Error pausing sandbox ${sandbox.sandboxId}:`,
        error
      )
      // Revert status on error
      await supabaseAdmin
        .from("e2b_sandboxes")
        .update({ status: "active" })
        .eq("sandbox_id", sandbox.sandboxId)
    }
  })

  return sandbox.sandboxId
}
