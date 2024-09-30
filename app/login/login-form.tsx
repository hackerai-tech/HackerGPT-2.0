"use client"

import { useState, useEffect } from "react"
import { IconEye, IconEyeOff, IconBrandGoogle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brand } from "@/components/ui/brand"

interface LoginFormProps {
  errorMessage: string
  onSignIn: (formData: FormData) => void
  onSignUp: (formData: FormData) => void
  onResetPassword: (formData: FormData) => void
  onSignInWithGoogle: () => void
}

export function LoginForm({
  errorMessage,
  onSignIn,
  onSignUp,
  onResetPassword,
  onSignInWithGoogle
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <div>
        <form className="animate-in flex w-full flex-1 flex-col justify-center gap-2">
          <Brand />

          <Button
            variant="default"
            className="mt-4"
            onClick={e => {
              e.preventDefault()
              onSignInWithGoogle()
            }}
          >
            <IconBrandGoogle className="mr-2" size={20} />
            Continue with Google
          </Button>
        </form>
        <div className="mt-4 flex items-center">
          <div className="grow border-t border-gray-300"></div>
          <span className="text-muted-foreground mx-4 text-sm">OR</span>
          <div className="grow border-t border-gray-300"></div>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault()
            onSignIn(new FormData(e.currentTarget))
          }}
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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <IconEyeOff size={20} className="text-muted-foreground" />
                ) : (
                  <IconEye size={20} className="text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" className="mt-4">
            Login
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={e => {
              e.preventDefault()
              onSignUp(new FormData(e.currentTarget.form!))
            }}
          >
            Sign Up
          </Button>

          {errorMessage && (
            <p className="mt-2 rounded bg-red-50 p-4 text-center text-sm text-red-500">
              {errorMessage}
            </p>
          )}

          <div className="text-muted-foreground mt-4 text-center text-sm">
            <span>By using PentestGPT, you agree to our </span>
            <a
              href="/terms"
              target="_blank"
              className="hover:text-primary underline"
            >
              Terms of Use
            </a>
          </div>

          <div className="text-muted-foreground mt-2 text-center text-sm">
            <span>Forgot your password? </span>
            <button
              onClick={e => {
                e.preventDefault()
                onResetPassword(new FormData(e.currentTarget.form!))
              }}
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
