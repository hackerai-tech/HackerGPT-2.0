"use client"

import { useState, FormEvent, useCallback } from "react"
import { IconEye, IconEyeOff, IconAlertCircle } from "@tabler/icons-react"
import { MicrosoftIcon } from "@/components/icons/microsoft-icon"
import { GoogleIcon } from "@/components/icons/google-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brand } from "@/components/ui/brand"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

interface LoginFormProps {
  onSignIn: (formData: FormData) => Promise<{ message: string }>
  onSignUp: (formData: FormData) => Promise<{ message: string }>
  onResetPassword: (formData: FormData) => Promise<{ message: string }>
  onSignInWithGoogle: () => Promise<{ error?: string; url?: string }>
  onSignInWithMicrosoft: () => Promise<{ error?: string; url?: string }>
  errorMessages: Record<string, string>
}

export function LoginForm({
  onSignIn,
  onSignUp,
  onResetPassword,
  onSignInWithGoogle,
  onSignInWithMicrosoft,
  errorMessages
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(
    async (
      e: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
      isSignUp: boolean
    ) => {
      e.preventDefault()
      let formData: FormData

      if (e.currentTarget instanceof HTMLFormElement) {
        formData = new FormData(e.currentTarget)
      } else {
        const form = e.currentTarget.closest("form")
        if (!form) {
          setErrorMessage(errorMessages["default"])
          return
        }
        formData = new FormData(form)
      }

      try {
        const result = isSignUp
          ? await onSignUp(formData)
          : await onSignIn(formData)
        setErrorMessage(errorMessages[result.message] || "")
      } catch (error: any) {
        console.error("Login error:", error)
        setErrorMessage(
          errorMessages[error.message] || errorMessages["default"]
        )
      }
    },
    [onSignIn, onSignUp, errorMessages]
  )

  const handleResetPassword = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      const form = e.currentTarget.closest("form")
      if (form) {
        const result = await onResetPassword(new FormData(form))
        setErrorMessage(errorMessages[result.message] || result.message)
      }
    },
    [onResetPassword, errorMessages]
  )

  const handleGoogleSignIn = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setIsLoading(true)
      setErrorMessage("")
      try {
        const result = await onSignInWithGoogle()
        if (result.error) {
          setErrorMessage(errorMessages["auth"])
        } else if (result.url) {
          window.location.href = result.url
        }
      } catch (error: any) {
        console.error("Google sign-in error:", error)
        setErrorMessage(errorMessages["auth"])
      } finally {
        setIsLoading(false)
      }
    },
    [onSignInWithGoogle, errorMessages]
  )

  const handleMicrosoftSignIn = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setIsLoading(true)
      setErrorMessage("")
      try {
        const result = await onSignInWithMicrosoft()
        if (result.error) {
          setErrorMessage(errorMessages["auth"])
        } else if (result.url) {
          window.location.href = result.url
        }
      } catch (error: any) {
        console.error("Microsoft sign-in error:", error)
        setErrorMessage(errorMessages["auth"])
      } finally {
        setIsLoading(false)
      }
    },
    [onSignInWithMicrosoft, errorMessages]
  )

  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <div>
        <form
          onSubmit={handleGoogleSignIn}
          className="animate-in flex w-full flex-1 flex-col justify-center gap-2"
        >
          <Brand />
          <Button variant="default" className="mt-4" type="submit">
            <GoogleIcon className="mr-2" width={20} height={20} />
            {isLoading ? "Redirecting..." : "Continue with Google"}
          </Button>
        </form>
        <form
          onSubmit={handleMicrosoftSignIn}
          className="animate-in mt-2 flex w-full flex-1 flex-col justify-center gap-2"
        >
          <Button variant="default" className="mt-2" type="submit">
            <MicrosoftIcon className="mr-2" width={20} height={20} />
            {isLoading ? "Redirecting..." : "Continue with Microsoft"}
          </Button>
        </form>
        <div className="mt-4 flex items-center">
          <div className="grow border-t border-gray-300"></div>
          <span className="text-muted-foreground mx-4 text-sm">OR</span>
          <div className="grow border-t border-gray-300"></div>
        </div>
        <form
          onSubmit={e => handleSubmit(e, false)}
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
                type={showPassword ? "text" : "password"}
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
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <IconEyeOff
                          size={20}
                          className="text-muted-foreground"
                        />
                      ) : (
                        <IconEye size={20} className="text-muted-foreground" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showPassword ? "Hide password" : "Show password"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {errorMessage && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                <IconAlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
          <Button type="submit" className="mt-4">
            Login
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={e => handleSubmit(e, true)}
          >
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
            <button
              onClick={handleResetPassword}
              className="hover:text-primary underline"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
