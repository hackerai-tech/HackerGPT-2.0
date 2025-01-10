import { createClient } from "@/lib/supabase/middleware"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Create initial response
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  })

  try {
    const { supabase } = createClient(request)

    // Always refresh session on callback URL
    if (request.nextUrl.pathname === '/auth/callback') {
      await supabase.auth.getUser()
      return response
    }

    // For other routes, proceed with normal auth checks
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Use the same check_mfa() function as RLS policies
      const { data: mfaCheck, error: mfaError } = await supabase
        .rpc('check_mfa')
      
      if (mfaError) throw mfaError

      // If MFA check fails and we're not already on the verify page
      if (!mfaCheck && !request.nextUrl.pathname.startsWith('/login/verify')) {
        return NextResponse.redirect(
          new URL('/login/verify', request.url))
      }

      // Handle root path redirect to user's home workspace
      const redirectToChat = request.nextUrl.pathname === "/"
      
      if (redirectToChat) {
        const { data: homeWorkspace, error } = await supabase
          .from("workspaces")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_home", true)
          .single()

        if (!homeWorkspace) {
          throw new Error(error?.message)
        }

        return NextResponse.redirect(
          new URL(`/${homeWorkspace.id}/chat`, request.url)
        )
      }
    }

    return response
  } catch (e) {
    return response
  }
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next|auth).*)"
}
