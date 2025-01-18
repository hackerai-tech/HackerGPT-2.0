"use server"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/"

  if (code) {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error

      // Get Google avatar if available
      if (data?.user?.app_metadata?.provider === "google") {
        const avatarUrl = data.user.user_metadata?.picture

        if (avatarUrl && data.user) {
          try {
            // Update profile directly using supabase query
            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                image_url: avatarUrl,
                image_path: ""
              })
              .eq("user_id", data.user.id)

            if (updateError) {
              console.error("Error updating profile:", updateError)
            }
          } catch (error) {
            console.error("Error updating profile with Google avatar:", error)
          }
        }
      }
    } catch (error: unknown) {
      // Handle email confirmation success case when user confirms email in the different browser session
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "bad_code_verifier" ||
          error.code === "validation_failed")
      ) {
        const redirectUrl = new URL(
          "/login",
          process.env.NEXT_PUBLIC_PRODUCTION_ORIGIN || requestUrl.origin
        )
        redirectUrl.searchParams.set("message", "signin_success")
        return NextResponse.redirect(redirectUrl)
      }

      // For all other errors, log and redirect with generic auth error
      console.error("Authentication error:", error)
      const redirectUrl = new URL(
        "/login",
        process.env.NEXT_PUBLIC_PRODUCTION_ORIGIN || requestUrl.origin
      )
      redirectUrl.searchParams.set("message", "auth")
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
