import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MFAVerification } from "./mfa-verification"

interface VerifyMFAResponse {
  success: boolean
  error?: string
}

export default async function VerifyMFA() {
  "use server"

  const supabase = await createClient()

  const [
    { data: mfaCheck, error: mfaError },
    {
      data: { user }
    }
  ] = await Promise.all([supabase.rpc("check_mfa"), supabase.auth.getUser()])

  // Handle MFA check error
  if (mfaError) {
    console.error("MFA check failed:", mfaError)
    throw mfaError
  }

  // Redirect if user doesn't need MFA or isn't authenticated
  if (mfaCheck) {
    return redirect("/")
  } else if (!user) {
    return redirect("/login")
  }

  const verifyMFA = async (code: string): Promise<VerifyMFAResponse> => {
    "use server"

    const supabase = await createClient()

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp[0]

      if (!totpFactor) {
        return {
          success: false,
          error: "MFA verification is not set up properly"
        }
      }

      const { data: challenge } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      })

      if (!challenge) {
        return {
          success: false,
          error: "Failed to initiate verification"
        }
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code
      })

      if (verifyError) {
        return {
          success: false,
          error: "Invalid verification code"
        }
      }

      return { success: true }
    } catch (error) {
      console.error("MFA verification error:", error)
      return {
        success: false,
        error: "Verification failed. Please try again"
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <MFAVerification onVerify={verifyMFA} />
    </div>
  )
}
