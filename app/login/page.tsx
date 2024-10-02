import { createClient } from "@/lib/supabase/server"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { get } from "@vercel/edge-config"
import { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { LoginForm } from "./login-form"
import { checkPasswordResetRateLimit } from "@/lib/server/password-reset-ratelimiter"

export const metadata: Metadata = {
  title: "Login"
}

const errorMessages: Record<string, string> = {
  "1": "Email is not allowed to sign up.",
  "2": "Check your email to continue the sign-in process.",
  "3": "Check email to reset password.",
  "4": "Invalid credentials provided.",
  "5": "Signup requires a valid password.",
  "6": "Your password must be at least 8 characters long.",
  "7": "Your password must include both uppercase and lowercase letters.",
  "8": "Your password must include at least one number.",
  "9": "Your password must include at least one special character (e.g., !@#$%^&*()).",
  "10": "Password reset email sent. Check your email to continue.",
  "11": "The email address is not in a valid format.",
  "12": "Password recovery requires an email.",
  password_reset_limit:
    "Too many password reset attempts. Please try again after an hour.",
  auth: "Authentication failed. Please try again or contact support if the issue persists.",
  default: "An unexpected error occurred."
}

export default async function Login({
  searchParams
}: {
  searchParams: { message: string; reset?: string }
}) {
  let errorMessage = ""

  if (searchParams.message) {
    try {
      const errorKey = decodeURIComponent(searchParams.message)
      errorMessage = errorMessages[errorKey] || errorMessages["default"]

      if (errorKey === "password_reset_limit") {
        errorMessage = errorMessages.password_reset_limit
      }
    } catch (e) {
      console.error("Failed to decode message:", e)
      errorMessage = errorMessages["default"]
    }
  }

  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const { data: { user } = {} } = await supabase.auth.getUser()

  if (user) {
    const { data: homeWorkspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      throw new Error(error.message)
    }

    return redirect(`/${homeWorkspace.id}/chat`)
  }

  const signIn = async (formData: FormData) => {
    "use server"

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const supabase = createClient(cookies())

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return redirect(`/login?message=11`)
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return redirect(`/login?message=4`)
    }

    const { data: homeWorkspace, error: homeWorkspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      throw new Error(
        homeWorkspaceError?.message || "An unexpected error occurred"
      )
    }

    return redirect(`/${homeWorkspace.id}/chat`)
  }

  const signUp = async (formData: FormData) => {
    "use server"

    const origin = headers().get("origin")
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return redirect(`/login?message=11`)
    }

    if (!password) {
      return redirect(`/login?message=5`)
    }

    const passwordChecks = [
      { test: password.length >= 8, message: "6" },
      { test: /[A-Z]/.test(password) && /[a-z]/.test(password), message: "7" },
      { test: /[0-9]/.test(password), message: "8" },
      {
        test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password),
        message: "9"
      }
    ]

    for (const check of passwordChecks) {
      if (!check.test) {
        return redirect(`/login?message=${check.message}`)
      }
    }

    let emailDomainWhitelist: string[] = []
    let emailWhitelist: string[] = []

    if (process.env.EMAIL_DOMAIN_WHITELIST || process.env.EDGE_CONFIG) {
      const patternsString =
        process.env.EMAIL_DOMAIN_WHITELIST ||
        (await get<string>("EMAIL_DOMAIN_WHITELIST"))
      emailDomainWhitelist = patternsString?.split(",") ?? []
    }

    if (process.env.EMAIL_WHITELIST || process.env.EDGE_CONFIG) {
      const patternsString =
        process.env.EMAIL_WHITELIST || (await get<string>("EMAIL_WHITELIST"))
      emailWhitelist = patternsString?.split(",") ?? []
    }

    if (
      (emailDomainWhitelist.length > 0 &&
        !emailDomainWhitelist.includes(email.split("@")[1])) ||
      (emailWhitelist.length > 0 && !emailWhitelist.includes(email))
    ) {
      return redirect(`/login?message=1`)
    }

    const supabase = createClient(cookies())

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // USE IF YOU WANT TO SEND EMAIL VERIFICATION, ALSO CHANGE TOML FILE
        emailRedirectTo: `${origin}/auth/callback`
      }
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    // return redirect("/setup")

    // USE IF YOU WANT TO SEND EMAIL VERIFICATION, ALSO CHANGE TOML FILE
    return redirect("/login?message=2")
  }

  const handleResetPassword = async (formData: FormData) => {
    "use server"

    const origin = headers().get("origin")
    const email = formData.get("email") as string

    // Check if email is provided
    if (!email || email.trim() === "") {
      return redirect(`/login?message=12`)
    }

    const ip = headers().get("x-forwarded-for")?.split(",")[0] || "unknown"
    const supabase = createClient(cookies())

    const { success } = await checkPasswordResetRateLimit(email, ip)
    if (!success) {
      return redirect(`/login?message=password_reset_limit`)
    }

    // Add a small delay to slow down automated attacks
    await new Promise(resolve => setTimeout(resolve, 1000))

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/login/password`
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    return redirect("/login?message=10")
  }

  const handleSignInWithGoogle = async () => {
    "use server"
    const supabase = createClient(cookies())
    const origin = headers().get("origin")

    const { error, data } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/login`
      }
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    return redirect(data.url)
  }

  return (
    <LoginForm
      errorMessage={errorMessage}
      onSignIn={signIn}
      onSignUp={signUp}
      onResetPassword={handleResetPassword}
      onSignInWithGoogle={handleSignInWithGoogle}
    />
  )
}
