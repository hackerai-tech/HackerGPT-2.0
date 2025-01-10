import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/browser-client"
import { toast } from "sonner"

export const useMFA = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [factors, setFactors] = useState<any[]>([])
  const [factorId, setFactorId] = useState("")
  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [error, setError] = useState("")
  const [isEnrolling, setIsEnrolling] = useState(false)

  const fetchFactors = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error

      // Only include verified factors
      const verifiedFactors = [...data.totp, ...data.phone].filter(
        factor => factor.status === "verified"
      )
      setFactors(verifiedFactors)
    } catch (error) {
      console.error("Error fetching MFA factors:", error)
      toast.error("Failed to load MFA status")
      setFactors([]) // Reset factors on error
    } finally {
      setIsLoading(false)
    }
  }

  const startEnrollment = async () => {
    try {
      setIsEnrolling(true)

      // First check for and delete any existing unverified TOTP factors
      const { data: existingFactors, error: listError } =
        await supabase.auth.mfa.listFactors()
      if (listError) throw listError

      const unverifiedFactor = existingFactors.all.find(
        f => f.factor_type === "totp" && f.status === "unverified"
      )

      if (unverifiedFactor) {
        // Delete the unverified factor
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: unverifiedFactor.id
        })
        if (unenrollError) throw unenrollError
      }

      // Create new factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp"
      })
      if (error) throw error

      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
    } catch (error) {
      console.error("Error enrolling MFA:", error)
      toast.error("Failed to start MFA enrollment")
      throw error
    } finally {
      setIsEnrolling(false)
    }
  }

  const verifyMFA = async (code: string) => {
    setError("")
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      })
      if (verifyError) throw verifyError

      await supabase.auth.refreshSession()
      toast.success("MFA enabled successfully")
      await fetchFactors()
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const verifyBeforeUnenroll = async (code: string) => {
    setError("")
    try {
      if (!factors[0]?.id) throw new Error("No MFA factor found")

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: factors[0].id })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factors[0].id,
        challengeId: challengeData.id,
        code
      })
      if (verifyError) throw verifyError

      // Only verify, don't unenroll yet
      return true
    } catch (error: any) {
      setError(error.message)
      toast.error(error.message)
      throw error
    }
  }

  const unenrollMFA = async () => {
    try {
      if (!factors[0]?.id) throw new Error("No MFA factor found")

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: factors[0].id
      })
      if (unenrollError) throw unenrollError

      await supabase.auth.refreshSession()
      toast.success("2FA disabled successfully")
      await fetchFactors()
    } catch (error: any) {
      setError(error.message)
      toast.error(error.message)
      throw error
    }
  }

  useEffect(() => {
    fetchFactors()
  }, [])

  return {
    isLoading,
    factors,
    factorId,
    qrCode,
    secret,
    error,
    isEnrolling,
    startEnrollment,
    verifyMFA,
    verifyBeforeUnenroll,
    unenrollMFA,
    fetchFactors
  }
}
