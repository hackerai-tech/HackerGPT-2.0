"use client"

import Loading from "@/app/[locale]/loading"
import { Button } from "@/components/ui/button"
import { PentestGPTContext } from "@/context/context"
import { getCheckoutUrl } from "@/lib/server/stripe-url"
import { getSubscriptionByUserId } from "@/db/subscriptions"
import * as Sentry from "@sentry/nextjs"
import {
  IconLoader2,
  IconCircleCheck,
  IconArrowLeft
} from "@tabler/icons-react"
import { Sparkle, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { FC, useContext, useState, useEffect } from "react"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import PentestGPTTextSVG from "@/components/icons/pentestgpt-text-svg"

export const UpgradePlan: FC = () => {
  const router = useRouter()
  const { profile, isMobile } = useContext(PentestGPTContext)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    const initialize = async () => {
      if (!profile) {
        setIsLoading(false)
        return
      }

      const subscription = await getSubscriptionByUserId(profile.user_id)

      if (subscription) {
        router.push("/login")
        return
      }

      const result = await getCheckoutUrl()
      if (result.type === "error") {
        Sentry.withScope(scope => {
          scope.setExtras({ userId: profile.user_id })
          scope.captureMessage(result.error.message)
        })
        toast.error(result.error.message)
      } else {
        setCheckoutUrl(result.value)
      }

      setIsLoading(false)
    }

    initialize()
  }, [profile, router])

  const handleUpgradeClick = async () => {
    if (checkoutUrl) {
      router.push(checkoutUrl)
    } else if (!isLoading && profile) {
      setIsLoading(true)
      const result = await getCheckoutUrl()
      setIsLoading(false)
      if (result.type === "error") {
        Sentry.withScope(scope => {
          scope.setExtras({ userId: profile.user_id })
          scope.captureMessage(result.error.message)
        })
        toast.error(result.error.message)
      } else {
        router.push(result.value)
      }
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (!profile) {
    return null
  }

  return (
    <div className="flex w-full flex-col">
      <div className="relative flex items-center justify-center p-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/login")}
          className="absolute left-4 p-2"
          aria-label="Exit"
        >
          <IconArrowLeft size={24} />
        </Button>
        <div className="flex w-full items-center justify-center">
          <PentestGPTTextSVG
            className={`${theme === "dark" ? "text-white" : "text-black"}`}
            scale={0.08}
          />
        </div>
      </div>

      <div className="flex grow flex-col items-center justify-center p-2 md:mt-24 md:p-8">
        <span className="mb-8 text-center text-2xl font-semibold md:text-3xl">
          Upgrade your plan
        </span>

        <div
          className={`grid w-full max-w-5xl ${
            isMobile ? "grid-cols-1 gap-4" : "grid-cols-2 gap-4"
          } lg:px-28`}
        >
          {/* Free Plan */}
          <PlanCard
            title="Free"
            price="USD $0/month"
            buttonText="Your current plan"
            buttonDisabled
          >
            <PlanStatement>Limited access to PGPT-3.5</PlanStatement>
            <PlanStatement>Limited access to plugins</PlanStatement>
            <PlanStatement>
              Limited access to web search and browsing
            </PlanStatement>
          </PlanCard>

          {/* Pro Plan */}
          <PlanCard
            title="Pro"
            price="USD $20/month"
            buttonText="Upgrade to Pro"
            buttonLoading={isLoading}
            onButtonClick={handleUpgradeClick}
          >
            <PlanStatement>Early access to new features</PlanStatement>
            <PlanStatement>Access to PGPT-4, GPT-4o, PGPT-3.5</PlanStatement>
            <PlanStatement>
              Access to file uploads, vision, code interpreter and terminal
            </PlanStatement>
            <PlanStatement>
              Access to advanced plugins like Nuclei, SQLi Exploiter,
              PortScanner, and more
            </PlanStatement>
            <PlanStatement>FLUX.1 image generation</PlanStatement>
          </PlanCard>
        </div>
      </div>

      <div className="h-8"></div>
    </div>
  )
}

interface PlanCardProps {
  title: string
  price: string
  buttonText: string
  buttonLoading?: boolean
  buttonDisabled?: boolean
  onButtonClick?: () => void
  children: React.ReactNode
}

const PlanCard: FC<PlanCardProps> = ({
  title,
  price,
  buttonText,
  buttonLoading,
  buttonDisabled,
  onButtonClick,
  children
}) => (
  <div className="bg-popover border-primary/20 flex flex-col rounded-lg border p-6 text-left shadow-md">
    <div className="mb-4">
      <h2 className="flex items-center text-xl font-bold">
        {title === "Free" ? (
          <Sparkle className="mr-2" size={18} />
        ) : (
          <Sparkles className="mr-2" size={18} />
        )}
        {title}
      </h2>
      <p className="text-muted-foreground mt-1">{price}</p>
    </div>
    <Button
      variant={buttonDisabled ? "outline" : "default"}
      onClick={onButtonClick}
      disabled={buttonDisabled || buttonLoading}
      className="mb-6 w-full"
    >
      {buttonLoading && <IconLoader2 size={22} className="mr-2 animate-spin" />}
      <span>{buttonText}</span>
    </Button>
    <div className="grow space-y-3">{children}</div>
  </div>
)

const PlanStatement: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-2 flex items-center">
    <div className="icon-container mr-2">
      <IconCircleCheck size={18} strokeWidth={1.5} />
    </div>
    <div className="text-container flex-1 text-base">
      <p>{children}</p>
    </div>
  </div>
)
