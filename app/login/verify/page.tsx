import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MFAVerification } from "./mfa-verification"

interface VerifyMFAResponse {
  success: boolean
  error?: string
}

export default async function VerifyMFA() {
  const supabase = await createClient()

  const [
    { data: mfaCheck, error: mfaError },
    {
      data: { user },
      error: userError
    }
  ] = await Promise.all([supabase.rpc("check_mfa"), supabase.auth.getUser()])

  // Handle errors more gracefully
  if (mfaError || userError) {
    console.error("Error checking MFA status:", mfaError || userError)
    return redirect("/login")
  }

  // Redirect if user doesn't need MFA or isn't authenticated
  if (!user || mfaCheck) {
    return redirect("/login")
  }

  const verifyMFA = async (code: string): Promise<VerifyMFAResponse> => {
    "use server"

    const supabase = await createClient()

    try {
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors()
      if (factorsError) {
        return {
          success: false,
          error: "Invalid verification code. Please try again."
        }
      }

      const totpFactor = factors.totp[0]
      if (!totpFactor) {
        return {
          success: false,
          error:
            "MFA verification is currently disabled. Please contact support."
        }
      }

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        })
      if (challengeError) {
        return {
          success: false,
          error: "Unable to verify code. Please try again."
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
          error: "Invalid verification code. Please try again."
        }
      }

      return { success: true }
    } catch (error) {
      console.error("Unexpected error during MFA verification:", error)
      return {
        success: false,
        error: "An unexpected error occurred. Please try again."
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <MFAVerification onVerify={verifyMFA} />
    </div>
  )
}
