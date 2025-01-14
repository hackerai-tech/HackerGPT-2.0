import { FC, useState, useEffect } from "react"
import { DialogPanel, DialogTitle } from "@headlessui/react"
import { Button } from "@/components/ui/button"
import { TransitionedDialog } from "@/components/ui/transitioned-dialog"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { useMFA } from "./use-mfa"
import { toast } from "sonner"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot
} from "../../ui/input-otp"
import { REGEXP_ONLY_DIGITS } from "input-otp"

interface MultiStepDeleteAccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  userEmail: string
  isDeleting: boolean
}

export const MultiStepDeleteAccountDialog: FC<
  MultiStepDeleteAccountDialogProps
> = ({ isOpen, onClose, onConfirm, userEmail, isDeleting }) => {
  const [step, setStep] = useState(1)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [mfaCode, setMfaCode] = useState("")
  const { factors, verifyBeforeUnenroll, fetchFactors } = useMFA()
  const hasMFA = factors.length > 0 && factors[0]?.status === "verified"

  useEffect(() => {
    if (isOpen) {
      fetchFactors()
    }
  }, [isOpen])

  const handleClose = () => {
    if (!isDeleting) {
      // Reset all state
      setStep(1)
      setConfirmEmail("")
      setMfaCode("")
      onClose()
    }
  }

  const handleNextStep = async () => {
    if (isDeleting || step >= 3) return

    if (step === 2) {
      if (hasMFA) {
        if (mfaCode.length !== 6) return
        try {
          await verifyBeforeUnenroll(mfaCode)
          setStep(3)
          setMfaCode("") // Clear MFA code after verification
        } catch (error) {
          return
        }
      } else if (confirmEmail.toLowerCase() === userEmail.toLowerCase()) {
        setStep(3)
      }
    } else {
      setStep(prev => Math.min(prev + 1, 3))
    }
  }

  const handleConfirm = async () => {
    if (isDeleting) return

    try {
      // Verify MFA again before final deletion if enabled
      await onConfirm()
    } catch (error) {
      toast.error("Failed to verify MFA")
      return
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <p className="text-center text-sm">
              Are you sure you want to delete your account? This action cannot
              be undone.
            </p>
            <div className="mt-4 flex justify-center space-x-4">
              <Button onClick={handleClose} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleNextStep}
                disabled={isDeleting}
              >
                Continue
              </Button>
            </div>
          </>
        )
      case 2:
        return hasMFA ? (
          <>
            <p className="mb-4 text-center text-sm">
              For security purposes, please enter your 2FA code to continue
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={mfaCode}
                onChange={value => setMfaCode(value)}
                disabled={isDeleting}
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
            <div className="mt-4 flex justify-center space-x-4">
              <Button onClick={handleClose} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleNextStep}
                disabled={mfaCode.length !== 6 || isDeleting}
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-center text-sm">
              To confirm account deletion, please enter your email address:{" "}
              {userEmail}
            </p>
            <Input
              type="email"
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              placeholder="Enter your email"
              className="mb-4"
              disabled={isDeleting}
            />
            <div className="flex justify-center space-x-4">
              <Button onClick={handleClose} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleNextStep}
                disabled={
                  confirmEmail.toLowerCase() !== userEmail.toLowerCase() ||
                  isDeleting
                }
              >
                Continue
              </Button>
            </div>
          </>
        )
      case 3:
        return (
          <>
            <p className="text-center text-sm">
              Deleting your account will remove all your data, including chats,
              settings, and personal information.
            </p>
            <p className="my-4 text-center text-sm">
              This action cannot be undone. Click &quot;Delete Account&quot; to
              proceed.
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={handleClose} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Deleting Account...
                  </>
                ) : (
                  "Delete Account"
                )}
              </Button>
            </div>
          </>
        )
    }
  }

  return (
    <TransitionedDialog isOpen={isOpen} onClose={handleClose}>
      <DialogPanel className="bg-popover w-full max-w-md overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all">
        <DialogTitle
          as="h3"
          className="mb-4 text-center text-lg font-medium leading-6"
        >
          Delete Account - Step {step} of 3
        </DialogTitle>
        {renderStepContent()}
      </DialogPanel>
    </TransitionedDialog>
  )
}
