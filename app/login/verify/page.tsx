import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MFAVerification } from "./mfa-verification"

export default async function VerifyMFA() {
  const verifyMFA = async (code: string) => {
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

      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code
      })
      if (verifyError) throw verifyError

      const { data: homeWorkspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", data.user.id)
        .eq("is_home", true)
        .single()

      if (homeWorkspace) {
        return redirect(`/${homeWorkspace.id}/chat`)
      }
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
