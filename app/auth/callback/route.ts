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
      // Handle successful email confirmation case
      // This error occurs when user confirms email in the different browser session
      if (
        error instanceof Error &&
        error.message?.includes(
          "both auth code and code verifier should be non-empty"
        )
      ) {
        const redirectUrl = new URL(
          "/login",
          process.env.NEXT_PUBLIC_PRODUCTION_ORIGIN || requestUrl.origin
        )
        redirectUrl.searchParams.set("message", "signin_success")
        return NextResponse.redirect(redirectUrl)
      }

      // Log error only for actual error cases
      console.error("Error exchanging code for session:", error)

      // Handle all other authentication errors
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
