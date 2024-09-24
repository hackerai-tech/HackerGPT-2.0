"use client"

import Loading from "@/app/loading"
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
import { TabGroup, TabList, Tab } from "@headlessui/react"

const YEARLY_PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRO_PRICE_ID

export const UpgradePlan: FC = () => {
  const router = useRouter()
  const { profile, isMobile } = useContext(PentestGPTContext)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [prefetchedPlan, setPrefetchedPlan] = useState<"monthly" | "yearly">(
    "monthly"
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isButtonLoading, setIsButtonLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "monthly"
  )
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
        setPrefetchedPlan("monthly")
      }

      setIsLoading(false)
    }

    initialize()
  }, [profile, router])

  const handleUpgradeClick = async () => {
    if (!isLoading && profile) {
      setIsButtonLoading(true)

      if (checkoutUrl && selectedPlan === prefetchedPlan) {
        // Use the prefetched URL if it matches the selected plan
        router.push(checkoutUrl)
      } else {
        // Fetch a new URL if plans don't match or no prefetched URL
        const result = await getCheckoutUrl(
          selectedPlan === "yearly" ? YEARLY_PRO_PRICE_ID : undefined
        )
        setIsButtonLoading(false)
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
  }

  if (isLoading) {
    return <Loading />
  }

  if (!profile) {
    return null
  }

  const planPrices = {
    free: { monthly: "$0", yearly: "$0" },
    pro: { monthly: "$25", yearly: "$20" }
  }

  const getYearlySavingsNote = () => {
    if (selectedPlan === "yearly") {
      return "Save $60 (3 months free)"
    }
    return ""
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

      <div className="flex grow flex-col items-center justify-center p-2 md:mt-16 md:p-8">
        <span className="mb-8 text-center text-2xl font-semibold md:text-3xl">
          Upgrade your plan
        </span>

        <TabGroup
          onChange={index =>
            setSelectedPlan(index === 0 ? "monthly" : "yearly")
          }
        >
          <TabList className="bg-secondary mx-auto mb-6 flex w-64 space-x-2 rounded-xl p-1">
            {["Monthly", "Yearly"].map(plan => (
              <Tab
                key={plan}
                className={({ selected }) =>
                  `w-full px-4 py-1.5 text-sm font-medium leading-5 rounded-lg
                  transition-all duration-200 ease-in-out
                  ${
                    selected
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
                  }`
                }
              >
                {plan}
              </Tab>
            ))}
          </TabList>
        </TabGroup>

        <div
          className={`grid w-full max-w-5xl ${
            isMobile ? "grid-cols-1 gap-4" : "grid-cols-2 gap-4"
          } lg:px-28`}
        >
          {/* Free Plan */}
          <PlanCard
            title="Free"
            price={`USD ${planPrices.free[selectedPlan]}/month`}
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
            price={`USD ${planPrices.pro[selectedPlan]}/month`}
            buttonText="Upgrade to Pro"
            buttonLoading={isButtonLoading}
            onButtonClick={handleUpgradeClick}
            savingsNote={getYearlySavingsNote()}
          >
            <PlanStatement>Early access to new features</PlanStatement>
            <PlanStatement>Access to PGPT-4, GPT-4o, PGPT-3.5</PlanStatement>
            <PlanStatement>
              Access to file uploads, vision, web search and browsing
            </PlanStatement>
            <PlanStatement>
              Access to advanced plugins like DNS Scanner, PortScanner, and more
            </PlanStatement>
            <PlanStatement>Access to terminal</PlanStatement>
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
  savingsNote?: string
  children: React.ReactNode
}

const PlanCard: FC<PlanCardProps> = ({
  title,
  price,
  buttonText,
  buttonLoading,
  buttonDisabled,
  onButtonClick,
  savingsNote,
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
      {savingsNote && (
        <p className="mt-1 text-sm font-medium text-green-500">{savingsNote}</p>
      )}
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
