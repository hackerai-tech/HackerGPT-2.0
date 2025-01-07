import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MFAVerification } from "./mfa-verification"

export default async function VerifyMFA() {
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

  const verifyMFA = async (code: string): Promise<{ success: boolean }> => {
    "use server"

    const supabase = await createClient()

    try {
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors()
      if (factorsError) throw factorsError

      const totpFactor = factors.totp[0]
      if (!totpFactor) {
        throw new Error("No TOTP factors found!")
      }

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code
      })
      if (verifyError) throw verifyError

      return { success: true }
    } catch (error) {
      throw error
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <MFAVerification onVerify={verifyMFA} />
    </div>
  )
}
