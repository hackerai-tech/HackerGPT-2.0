import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/"

  if (code) {
    const supabase = await createClient()

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } catch (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_PRODUCTION_ORIGIN || requestUrl.origin}/login?message=auth`
      )
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
