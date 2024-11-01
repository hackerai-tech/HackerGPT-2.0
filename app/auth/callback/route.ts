import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/"

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

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

  const redirectUrl = new URL(
    next,
    process.env.NEXT_PUBLIC_PRODUCTION_ORIGIN || requestUrl.origin
  )
  return NextResponse.redirect(redirectUrl.toString())
}
