import { FC } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="flex flex-col items-center">
            {qrCode && (
              <img src={qrCode} alt="QR Code for MFA" className="size-48" />
            )}
            <p className="text-muted-foreground mt-2 text-sm">
              Scan this QR code with your authenticator app
            </p>
            <Button
              variant="ghost"
              onClick={() => setShowSecret(!showSecret)}
              className="mt-2"
            >
              {showSecret ? "Hide secret code" : "Can't scan the code?"}
            </Button>
            {showSecret && (
              <div className="bg-muted mt-2 rounded p-2 text-center">
                <p className="break-all font-mono text-sm">{secret}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Enter this code manually in your authenticator app
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="verifyCode">Enter verification code</Label>
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
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onVerify(verifyCode)}>Enable</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
