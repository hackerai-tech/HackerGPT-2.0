import { Brand } from "@/components/ui/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { get } from "@vercel/edge-config"
import { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { IconEye, IconEyeOff, IconAlertCircle } from "@tabler/icons-react"
import { MicrosoftIcon } from "@/components/icons/microsoft-icon"
import { GoogleIcon } from "@/components/icons/google-icon"
import { checkPasswordResetRateLimit } from "@/lib/server/password-reset-ratelimiter"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip"

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

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validatePassword = (password: string) => {
  const checks = [
    { test: password.length >= 8, message: "6" },
    { test: /[A-Z]/.test(password) && /[a-z]/.test(password), message: "7" },
    { test: /[0-9]/.test(password), message: "8" },
    {
      test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password),
      message: "9"
    }
  ]

  for (const check of checks) {
    if (!check.test) return check.message
  }
  return null
}

export default async function Login({
  searchParams
}: {
  searchParams: { message?: string }
}) {
  const errorMessage = searchParams.message
    ? errorMessages[searchParams.message] || errorMessages["default"]
    : null

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
      return { message: "default" }
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
      return redirect("/login?message=11")
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return redirect("/login?message=4")
    }

    const { data: homeWorkspace, error: homeWorkspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      return redirect("/login?message=default")
    }

    return redirect(`/${homeWorkspace.id}/chat`)
  }

  const signUp = async (formData: FormData) => {
    "use server"
    try {
      const origin = headers().get("origin")
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      if (!validateEmail(email)) return redirect("/login?message=11")
      if (!password) return redirect("/login?message=5")

      const passwordError = validatePassword(password)
      if (passwordError) return redirect("/login?message=" + passwordError)

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
        return redirect("/login?message=1")
      }

      const supabase = createClient(cookies())
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`
        }
      })

      if (error) {
        console.error("Sign-up error:", error)
        return redirect("/login?message=auth")
      }

      return redirect("/login?message=2")
    } catch (error) {
      console.error("Unexpected error during sign-up:", error)
      return redirect("/login?message=default")
    }
  }

  const handleResetPassword = async (formData: FormData) => {
    "use server"

    const origin = headers().get("origin")
    const email = formData.get("email") as string

    if (!email || email.trim() === "") return redirect("/login?message=12")
    if (!validateEmail(email)) return redirect("/login?message=11")

    const ip = headers().get("x-forwarded-for")?.split(",")[0] || "unknown"
    const supabase = createClient(cookies())

    const { success } = await checkPasswordResetRateLimit(email, ip)
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
    const supabase = createClient(cookies())
    const origin = headers().get("origin")

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
    const supabase = createClient(cookies())
    const origin = headers().get("origin")

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${origin}/auth/callback?next=/login`
      }
    })

    if (error) {
      return redirect(`/login?message=auth`)
    }

    return redirect(data.url)
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <div>
        <form
          action={handleSignInWithGoogle}
          className="animate-in flex w-full flex-1 flex-col justify-center gap-2"
        >
          <Brand />
          <Button variant="default" className="mt-4" type="submit">
            <GoogleIcon className="mr-2" width={20} height={20} />
            Continue with Google
          </Button>
        </form>
        <form
          action={handleSignInWithMicrosoft}
          className="animate-in mt-2 flex w-full flex-1 flex-col justify-center gap-2"
        >
          <Button variant="default" className="mt-2" type="submit">
            <MicrosoftIcon className="mr-2" width={20} height={20} />
            Continue with Microsoft
          </Button>
        </form>
        <div className="mt-4 flex items-center">
          <div className="grow border-t border-gray-300"></div>
          <span className="text-muted-foreground mx-4 text-sm">OR</span>
          <div className="grow border-t border-gray-300"></div>
        </div>
        <form
          action={signIn}
          className="animate-in mt-4 flex w-full flex-1 flex-col justify-center gap-3"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="mt-2 space-y-2">
            <Label htmlFor="password" className="flex items-center">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    >
                      <IconEye size={20} className="text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show password</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          {errorMessage && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
              <IconAlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}
          <Button type="submit" className="mt-4">
            Login
          </Button>
          <Button type="submit" variant="secondary" formAction={signUp}>
            Sign Up
          </Button>
          <div className="text-muted-foreground mt-4 px-8 text-center text-sm sm:px-0">
            <span>By using PentestGPT, you agree to our </span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary underline"
            >
              Terms of Use
            </a>
          </div>
          <div className="text-muted-foreground mt-2 text-center text-sm">
            <span>Forgot your password? </span>
            <Button
              variant="link"
              className="p-0 text-sm"
              formAction={handleResetPassword}
            >
              Reset
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
