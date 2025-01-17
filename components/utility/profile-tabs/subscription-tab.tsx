import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PentestGPTContext } from "@/context/context"
import { getBillingPortalUrl } from "@/lib/server/stripe-url"
import { SubscriptionStatus } from "@/types/chat"
import { IconRefresh } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { FC, useContext, useState } from "react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

interface SubscriptionTabProps {
  userEmail: string
  isMobile: boolean
}

export const SubscriptionTab: FC<SubscriptionTabProps> = ({
  userEmail,
  isMobile
}) => {
  const router = useRouter()
  const isLongEmail = userEmail.length > 30
  const [loading, setLoading] = useState(false)
  const {
    isPremiumSubscription,
    subscriptionStatus,
    updateSubscription,
    fetchStartingData
  } = useContext(PentestGPTContext)

  const redirectToBillingPortal = async () => {
    setLoading(true)
    const checkoutUrlResult = await getBillingPortalUrl()
    setLoading(false)
    if (checkoutUrlResult.type === "error") {
      toast.error(checkoutUrlResult.error.message)
    } else {
      router.push(checkoutUrlResult.value)
    }
  }

  const handleRestoreButtonClick = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/stripe/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "An error occurred while restoring the subscription"
        )
      }

      await fetchStartingData()

      if (data.message) {
        toast.warning(data.message)
      } else if (data.subscription) {
        toast.success("Your subscription has been restored.")
        updateSubscription(data.subscription)
      }
    } catch (error: any) {
      console.error("Error restoring subscription:", error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradeClick = () => {
    router.push("/upgrade")
  }

  const showRestoreSubscription =
    subscriptionStatus === "free" &&
    process.env.NEXT_PUBLIC_ENABLE_STRIPE_RESTORE === "true"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Current plan</Label>
          <p className="mt-1">
            <PlanName subscriptionStatus={subscriptionStatus} />
          </p>
        </div>
        {isPremiumSubscription ? (
          <Button
            variant="secondary"
            disabled={loading}
            onClick={redirectToBillingPortal}
            className="flex items-center"
          >
            Manage subscription
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={loading}
            onClick={handleUpgradeClick}
            className="flex items-center"
          >
            Upgrade to Pro
          </Button>
        )}
      </div>

      {showRestoreSubscription && (
        <div className="mt-4 flex items-center justify-between">
          <Label className="text-sm font-medium">Restore subscription</Label>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={handleRestoreButtonClick}
            className="flex items-center"
          >
            <IconRefresh className="mr-2" size={18} />
            Restore
          </Button>
        </div>
      )}

      <Separator className="my-4" />

      <div
        className={
          isLongEmail || isMobile
            ? "space-y-2"
            : "flex items-center justify-between"
        }
      >
        <Label htmlFor="email-input">Email address</Label>
        <Input
          id="email-input"
          value={userEmail}
          readOnly
          className="bg-secondary w-full cursor-default truncate sm:w-2/3"
        />
      </div>
    </div>
  )
}

interface PlanNameProps {
  subscriptionStatus: SubscriptionStatus
}

export const PlanName: FC<PlanNameProps> = ({ subscriptionStatus }) => {
  const planName =
    subscriptionStatus?.charAt(0).toUpperCase() + subscriptionStatus?.slice(1)

  return (
    <span
      className={`text-xl font-bold ${subscriptionStatus !== "free" ? "text-primary" : "text-muted-foreground"}`}
    >
      {planName}
    </span>
  )
}
