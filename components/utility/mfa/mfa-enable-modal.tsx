import { FC } from "react"
import { DialogPanel, DialogTitle, Dialog } from "@headlessui/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface MFAEnableModalProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (code: string) => Promise<void>
  qrCode: string
  verifyCode: string
  setVerifyCode: (code: string) => void
  error: string
  secret: string
  showSecret: boolean
  setShowSecret: (show: boolean) => void
}

export const MFAEnableModal: FC<MFAEnableModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  qrCode,
  verifyCode,
  setVerifyCode,
  error,
  secret,
  showSecret,
  setShowSecret
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-primary-foreground mx-auto max-w-md rounded-lg p-6 shadow-xl">
          <DialogTitle className="text-lg font-medium">
            Secure your account
          </DialogTitle>

          <div className="mt-4 space-y-4">
            <div className="flex flex-col items-center">
              <p className="text-muted-foreground text-sm">
                Scan the QR Code below using your preferred authenticator app
                and then enter the provided one-time code below.
              </p>
              {!showSecret && qrCode && (
                <img
                  src={qrCode}
                  alt="QR Code for MFA"
                  className="mt-4 size-48 rounded-md p-2 dark:bg-white"
                />
              )}
              {showSecret && (
                <div className="mt-4 text-center">
                  <p className="break-all font-mono text-base">{secret}</p>
                  <Button
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(secret)}
                    className="mt-4"
                  >
                    Copy code
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={() => setShowSecret(!showSecret)}
                className="mt-2 underline"
              >
                {showSecret ? "Show QR code" : "Trouble scanning?"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verifyCode">Enter verification code</Label>
              <input
                id="verifyCode"
                type="text"
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.trim())}
                className={`w-full rounded border p-2 ${error ? "border-red-500" : ""}`}
                placeholder="Enter 6-digit code"
              />
              {error && (
                <div className="mt-1 text-sm text-red-500">{error}</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => onVerify(verifyCode)}>Enable</Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
