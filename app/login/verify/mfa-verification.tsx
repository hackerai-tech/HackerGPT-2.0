"use client"

import { useState } from "react"
import { Brand } from "@/components/ui/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IconAlertCircle } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { supabase } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"

interface MFAVerificationProps {
  onVerify: (code: string) => Promise<void>
}

export function MFAVerification({ onVerify }: MFAVerificationProps) {
  const router = useRouter()
  const [verifyCode, setVerifyCode] = useState("")
  const [error, setError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsVerifying(true)

    try {
      const result = await onVerify(verifyCode)
      // Don't set any state after successful verification
      // Just let the redirect happen naturally
      return result
    } catch (error) {
      setError((error as Error).message)
      setIsVerifying(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" })
    router.push("/login")
    router.refresh()
  }

  return (
    <Card className="mx-4 w-full max-w-md">
      <CardHeader className="space-y-2">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <CardTitle className="text-center text-2xl">
          Two-Factor Authentication
        </CardTitle>
        <CardDescription className="text-center">
          Enter the 6-digit code from your authenticator app to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="flex w-full max-w-[280px] gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  value={verifyCode}
                  onChange={e =>
                    setVerifyCode(e.target.value.replace(/\D/g, ""))
                  }
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

            <div className="flex flex-col gap-2">
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
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
