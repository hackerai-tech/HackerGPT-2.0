import { createClient } from "@/lib/supabase/server"
import { get } from "@vercel/edge-config"
import { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { checkAuthRateLimit } from "@/lib/server/check-auth-ratelimit"
import { LoginForm } from "./form"

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
  auth: "Authentication failed. Please try again or contact support if the issue persists.",
  default: "An unexpected error occurred.",
  captcha_required: "Please complete the captcha verification.",
  ratelimit_defaul: "Too many attempts. Please try again later.",
  "13": "Too many login attempts. Please try again later.",
  "14": "Too many signup attempts. Please try again later.",
  password_reset_limit:
    "Too many password reset attempts. Please try again later."
}

const messageTypes: Record<string, "error" | "success" | "warning"> = {
  "1": "error",
  "2": "success",
  "3": "success",
  "4": "error",
  "5": "error",
  "6": "error",
  "7": "error",
  "8": "error",
  "9": "error",
  "10": "success",
  "11": "error",
  "12": "error",
  "13": "warning",
  "14": "warning",
  auth: "error",
  default: "error",
  captcha_required: "error",
  ratelimit_default: "warning",
  password_reset_limit: "warning"
}

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export default async function Login({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  let errorMessage = params.message
    ? errorMessages[params.message] || errorMessages["default"]
    : null
  const messageType = params.message
    ? messageTypes[params.message] || "error"
    : "error"

  if (
    params.message &&
    params.message.startsWith("For security purposes, you can only request")
  ) {
    errorMessage = errorMessages.ratelimit_defaul
  }

  const checkAuth = async () => {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (user) {
      const { data: homeWorkspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_home", true)
        .single()

      if (homeWorkspace) {
        return redirect(`/${homeWorkspace.id}/chat`)
      }
    }
  }

  await checkAuth()

  const signIn = async (formData: FormData) => {
    "use server"

    const supabase = await createClient()
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const captchaToken = formData.get("cf-turnstile-response") as string
    const headersList = await headers()
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown"

    if (!captchaToken) {
      return redirect(`/login?message=captcha_required`)
    }

    const { success } = await checkAuthRateLimit(email, ip, "login")
    if (!success) return redirect("/login?message=13")

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return redirect(`/login?message=11`)
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken
      }
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

    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get("origin")
    const email = formData.get("email") as string
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const captchaToken = formData.get("cf-turnstile-response") as string

    if (!captchaToken) {
      return redirect(`/login?message=captcha_required`)
    }

    const { success } = await checkAuthRateLimit(email, ip, "signup")
    if (!success) return redirect("/login?message=14")

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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
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

    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get("origin")
    const email = formData.get("email") as string
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown"

    if (!email || email.trim() === "") return redirect("/login?message=12")
    if (!validateEmail(email)) return redirect("/login?message=11")

    const { success } = await checkAuthRateLimit(email, ip, "password-reset")
    if (!success) return redirect("/login?message=password_reset_limit")

    await new Promise(resolve => setTimeout(resolve, 1000))

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/login/password`
    })

    if (error) return redirect("/login?message=" + error.message)

    return redirect("/login?message=10")
  }

  const handleSignInWithGoogle = async () => {
    "use server"

    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get("origin")

    const { error, data } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/login`
      }
    })

    if (error) {
      return redirect(`/login?message=auth`)
    }

    return redirect(data.url)
  }

  const handleSignInWithMicrosoft = async () => {
    "use server"

    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get("origin")

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${origin}/auth/callback?next=/login`,
        scopes: "email"
      }
    })

    if (error) {
      return redirect(`/login?message=auth`)
    }

    return redirect(data.url)
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <LoginForm
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={handleResetPassword}
        onGoogleSignIn={handleSignInWithGoogle}
        onMicrosoftSignIn={handleSignInWithMicrosoft}
        errorMessage={errorMessage}
        messageType={messageType}
      />
    </div>
  )
}
