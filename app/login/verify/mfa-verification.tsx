"use client"

import { useContext, useState } from "react"
import { Brand } from "@/components/ui/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IconAlertCircle } from "@tabler/icons-react"
import { supabase } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"
import { PentestGPTContext } from "@/context/context"
import { getHomeWorkspaceByUserId } from "@/db/workspaces"

interface MFAVerificationProps {
  onVerify: (code: string) => Promise<{ success: boolean } | void>
}

export function MFAVerification({ onVerify }: MFAVerificationProps) {
  const router = useRouter()
  const [verifyCode, setVerifyCode] = useState("")
  const [error, setError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const { user } = useContext(PentestGPTContext)
  const { fetchStartingData } = useContext(PentestGPTContext)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsVerifying(true)

    if (!user) {
      router.push("/login")
      return
    }

    try {
      const result = await onVerify(verifyCode)
      if (result?.success) {
        await fetchStartingData()
        const homeWorkspaceId = await getHomeWorkspaceByUserId(user.id)
        router.push(`/${homeWorkspaceId}/chat`)
      }
    } catch (err) {
      setIsVerifying(false)

      // Handle Supabase Auth specific errors
      if (err instanceof Error) {
        const error = err as any // for accessing .code property

        switch (error.code) {
          case "mfa_verification_failed":
            setError("Invalid verification code. Please try again.")
            break
          case "mfa_challenge_expired":
            setError("Verification code has expired. Please request a new one.")
            break
          case "over_request_rate_limit":
            setError(
              "Too many attempts. Please wait a few minutes before trying again."
            )
            break
          case "mfa_totp_verify_not_enabled":
            setError(
              "MFA verification is currently disabled. Please contact support."
            )
            break
          case "mfa_verification_rejected":
            setError(
              "Verification was rejected. Please try again or contact support."
            )
            break
          default:
            // Check for specific error messages as fallback
            if (error.message?.includes("Invalid one-time password")) {
              setError("Invalid verification code. Please try again.")
            } else if (error.message?.includes("rate limit")) {
              setError("Too many attempts. Please wait a moment and try again.")
            } else {
              console.error("MFA Verification Error:", error)
              setError(
                "Unable to verify code. Please try again or contact support."
              )
            }
        }
      } else {
        console.error("Unknown MFA Error:", err)
        setError("An unexpected error occurred. Please try again.")
      }
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="mx-4 w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        className="animate-in flex w-full flex-1 flex-col justify-center gap-3"
      >
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>

        <h2 className="text-center text-2xl font-semibold">
          Two-Factor Authentication
        </h2>
        <p className="text-muted-foreground mb-4 text-center">
          Enter the 6-digit code from your authenticator app to continue
        </p>

        <div className="flex justify-center">
          <div className="flex w-full max-w-[280px] gap-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="text-center text-lg tracking-widest"
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              disabled={isVerifying}
              required
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-sm text-red-500">
            <IconAlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={verifyCode.length !== 6 || isVerifying}
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Cancel and sign out
          </button>
          <a
            href="https://help.hackerai.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground text-center text-sm transition-colors"
          >
            Need help? Visit our Help Center
          </a>
        </div>
      </form>
    </div>
  )
}
