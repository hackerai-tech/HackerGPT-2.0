"use client"

import { useContext, useState } from "react"
import { Brand } from "@/components/ui/brand"
import { Button } from "@/components/ui/button"
import { IconAlertCircle } from "@tabler/icons-react"
import { supabase } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"
import { PentestGPTContext } from "@/context/context"
import { getHomeWorkspaceByUserId } from "@/db/workspaces"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot
} from "@/components/ui/input-otp"
import { REGEXP_ONLY_DIGITS } from "input-otp"

interface MFAVerificationProps {
  onVerify: (code: string) => Promise<{ success: boolean; error?: string }>
}

export function MFAVerification({ onVerify }: MFAVerificationProps) {
  const router = useRouter()
  const [verifyCode, setVerifyCode] = useState("")
  const [error, setError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const { user, fetchStartingData } = useContext(PentestGPTContext)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || verifyCode.length !== 6 || isVerifying) return

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
        router.push(`/${homeWorkspaceId}/c`)
      } else {
        setError(result.error || "Verification failed")
        setVerifyCode("")
      }
    } catch (error) {
      setError("Please try again")
      setVerifyCode("")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Sign out error:", error)
      router.push("/login")
    }
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
          <InputOTP
            maxLength={6}
            value={verifyCode}
            onChange={value => setVerifyCode(value)}
            disabled={isVerifying}
            pattern={REGEXP_ONLY_DIGITS}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
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
