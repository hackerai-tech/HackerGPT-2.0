import { FC, useState } from "react"
import { Button } from "../../ui/button"
import { Label } from "../../ui/label"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"
import { toast } from "sonner"
import { MFAEnableModal } from "../mfa/mfa-enable-modal"
import { MFADisableModal } from "../mfa/mfa-disable-modal"
import { useMFA } from "../mfa/use-mfa"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const SecurityTab: FC = () => {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showMFAModal, setShowMFAModal] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showConfirmDisable, setShowConfirmDisable] = useState(false)
  const [verifyCode, setVerifyCode] = useState("")

  const {
    isLoading,
    factors,
    qrCode,
    secret,
    error,
    isEnrolling,
    startEnrollment,
    verifyMFA,
    verifyBeforeUnenroll,
    unenrollMFA
  } = useMFA()

  const handleLogoutAllDevices = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut({ scope: "global" })
      router.push("/login")
      router.refresh()
      toast.success("Logged out of all devices")
    } catch (error) {
      console.error("Error logging out:", error)
      toast.error("Failed to log out of all devices")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleEnableClick = async () => {
    try {
      await startEnrollment()
      setShowMFAModal(true)
    } catch {
      setShowMFAModal(false)
    }
  }

  const handleVerify = async (code: string) => {
    try {
      await verifyMFA(code)
      setShowMFAModal(false)
      setVerifyCode("")
    } catch {
      // Error is handled in the hook
    }
  }

  const handleVerifyForDisable = async (code: string) => {
    try {
      await verifyBeforeUnenroll(code)
      setShowVerifyModal(false)
      setVerifyCode("")
      // After successful verification, show the confirmation modal
      setShowConfirmDisable(true)
    } catch {
      // Error is handled in the hook
    }
  }

  const handleConfirmDisable = async () => {
    try {
      await unenrollMFA()
      setShowConfirmDisable(false)
    } catch {
      // Error is handled in the hook
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="enableMFA">Multi-factor authentication</Label>
            {factors.length > 0 && <Badge variant="default">Enabled</Badge>}
          </div>
          <p className="text-muted-foreground max-w-[90%] text-sm">
            Add an extra layer of security to your account by requiring both a
            password and an authentication code.
          </p>
        </div>
        {factors.length > 0 ? (
          <Button
            variant="destructive"
            onClick={() => setShowVerifyModal(true)}
            disabled={isLoading}
            aria-label="Disable two-factor authentication"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Disable"
            )}
          </Button>
        ) : (
          <Button
            onClick={handleEnableClick}
            disabled={isLoading || isEnrolling}
            aria-label="Enable two-factor authentication"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Enable"}
          </Button>
        )}
      </div>

      <MFAEnableModal
        isOpen={showMFAModal}
        onClose={() => setShowMFAModal(false)}
        onVerify={handleVerify}
        qrCode={qrCode}
        verifyCode={verifyCode}
        setVerifyCode={setVerifyCode}
        error={error}
        secret={secret}
        showSecret={showSecret}
        setShowSecret={setShowSecret}
      />

      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Identity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Please enter your 2FA code to verify your identity.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="verifyCode">Verification Code</Label>
              <input
                id="verifyCode"
                type="text"
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.trim())}
                className="w-full rounded border p-2"
                placeholder="Enter 6-digit code"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVerifyModal(false)
                  setVerifyCode("")
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleVerifyForDisable(verifyCode)}>
                Verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MFADisableModal
        isOpen={showConfirmDisable}
        onClose={() => setShowConfirmDisable(false)}
        onDisable={handleConfirmDisable}
      />

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Label htmlFor="logoutAllDevices">Log out of all devices</Label>
          <p className="text-muted-foreground max-w-[90%] text-sm">
            Log out of all active sessions across all devices, including your
            current session. It may take up to 30 minutes for other devices to
            be logged out.
          </p>
        </div>
        <Button
          id="logoutAllDevices"
          variant="destructive"
          onClick={handleLogoutAllDevices}
          disabled={isLoggingOut}
          aria-label="Log out of all devices"
        >
          {isLoggingOut ? "Logging out..." : "Log out all"}
        </Button>
      </div>
    </div>
  )
}
