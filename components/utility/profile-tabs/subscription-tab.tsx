import { FC, useContext, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { TabsContent } from "@/components/ui/tabs"
import { PentestGPTContext } from "@/context/context"
import { getBillingPortalUrl } from "@/lib/server/stripe-url"
import { restoreSubscription } from "@/lib/server/restore"
import { toast } from "sonner"
import * as Sentry from "@sentry/nextjs"
import { IconRefresh } from "@tabler/icons-react"

interface SubscriptionTabProps {
  value: string
  userEmail: string
  isMobile: boolean
}

export const SubscriptionTab: FC<SubscriptionTabProps> = ({
  value,
  userEmail,
  isMobile
}) => {
  const router = useRouter()
  const isLongEmail = userEmail.length > 30
  const [loading, setLoading] = useState(false)
  const { subscription, setSubscription, profile } =
    useContext(PentestGPTContext)
  const isPremium = subscription !== null

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
      const restoreResult = await restoreSubscription()
      if (restoreResult.type === "error") {
        Sentry.withScope(scope => {
          scope.setExtra("user.id", profile?.user_id)
          Sentry.captureMessage(restoreResult.error.message)
        })
        toast.error(restoreResult.error.message)
      } else {
        if (restoreResult.value === null) {
          toast.warning("You have no subscription to restore.")
        } else {
          toast.success("Your subscription has been restored.")
          setSubscription(restoreResult.value)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradeClick = () => {
    router.push("/upgrade")
  }

  const showRestoreSubscription =
    !isPremium && process.env.NEXT_PUBLIC_ENABLE_STRIPE_RESTORE === "true"

  return (
    <TabsContent className="space-y-4" value={value}>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Current plan</Label>
          <p className="mt-1">
            <PlanName subscription={subscription} />
          </p>
        </div>
        {isPremium ? (
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

      <hr className="border-border my-4 border-t" />

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
    </TabsContent>
  )
}

interface PlanNameProps {
  subscription: any | null
}

export const PlanName: FC<PlanNameProps> = ({ subscription }) => {
  const planType = subscription?.plan_type || "free"
  const planName = planType.charAt(0).toUpperCase() + planType.slice(1)

  return (
    <span
      className={`text-xl font-bold ${subscription ? "text-primary" : "text-muted-foreground"}`}
    >
      {planName}
    </span>
  )
}
