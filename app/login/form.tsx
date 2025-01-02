"use client"

import { useState } from "react"
import { Turnstile } from "@marsidev/react-turnstile"
import { Brand } from "@/components/ui/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconAlertCircle } from "@tabler/icons-react"
import { MicrosoftIcon } from "@/components/icons/microsoft-icon"
import { GoogleIcon } from "@/components/icons/google-icon"
import { PasswordInput } from "@/components/ui/password-input"

export function LoginForm({
  onSignIn,
  onSignUp,
  onResetPassword,
  onGoogleSignIn,
  onMicrosoftSignIn,
  errorMessage
}: {
  onSignIn: (formData: FormData) => Promise<void>
  onSignUp: (formData: FormData) => Promise<void>
  onResetPassword: (formData: FormData) => Promise<void>
  onGoogleSignIn: () => Promise<void>
  onMicrosoftSignIn: () => Promise<void>
  errorMessage: string | null
}) {
  const [captchaToken, setCaptchaToken] = useState<string>("")

  return (
    <div>
      <form
        action={onGoogleSignIn}
        className="animate-in flex w-full flex-1 flex-col justify-center gap-2"
      >
        <Brand />
        <Button variant="default" className="mt-4" type="submit">
          <GoogleIcon className="mr-2" width={20} height={20} />
          Continue with Google
        </Button>
      </form>

      <form
        action={onMicrosoftSignIn}
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
        action={onSignIn}
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
          <Label className="text-md" htmlFor="password">
            Password
          </Label>
          <PasswordInput />
        </div>

        <div className="mt-2 flex justify-center">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={token => {
              setCaptchaToken(token)
            }}
            options={{
              theme: "auto"
            }}
            className="flex justify-center"
          />
        </div>

        <input
          type="hidden"
          name="cf-turnstile-response"
          value={captchaToken}
        />

        {errorMessage && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
            <IconAlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button type="submit" className="mt-4">
          Login
        </Button>
        <Button type="submit" variant="secondary" formAction={onSignUp}>
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
            formAction={onResetPassword}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  )
}
