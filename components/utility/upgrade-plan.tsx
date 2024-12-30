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
import { Sparkles, Users } from "lucide-react"
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
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "monthly"
  )
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "team" | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const initialize = async () => {
      if (!profile) {
        setIsLoading(false)
        return
      }

      try {
        const subscription = await getSubscriptionByUserId(profile.user_id)

        if (subscription) {
          router.push("/login")
          return
        }

        const result = await getCheckoutUrl()
        if (result.type === "error") {
          throw new Error(result.error.message)
        } else {
          setCheckoutUrl(result.value)
        }
      } catch (error) {
        Sentry.captureException(error)
        toast.error(
          "Failed to load subscription information. Please try again."
        )
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [profile, router])

  const handleUpgradeClick = async (planType: "pro" | "team") => {
    if (isLoading || !profile) return

    setLoadingPlan(planType)

    try {
      if (planType === "team") {
        redirectToNewTeamPage()
        return
      }

      let url: string | null = null
      const priceId: string | undefined =
        selectedPlan === "yearly" ? YEARLY_PRO_PRICE_ID : undefined

      if (checkoutUrl && selectedPlan === "monthly") {
        url = checkoutUrl
      } else {
        const result = await getCheckoutUrl(priceId)
        if (result.type === "error") {
          throw new Error(result.error.message)
        }
        url = result.value
      }

      router.push(url)
    } catch (error) {
      Sentry.captureException(error)
      toast.error("Failed to process upgrade. Please try again.")
    } finally {
      setLoadingPlan(null)
    }
  }

  const redirectToNewTeamPage = () => {
    const yearlyParam = selectedPlan === "yearly" ? "true" : "false"
    router.push(`/team/new-team?yearly=${yearlyParam}`)
  }

  if (isLoading) {
    return <Loading />
  }

  if (!profile) {
    return null
  }

  const planPrices = {
    pro: { monthly: "$25", yearly: "$20" },
    team: { monthly: "$40", yearly: "$32" }
  }

  const getYearlySavingsNote = (plan: "pro" | "team") => {
    if (selectedPlan === "yearly") {
      return plan === "pro" ? "Save $60" : "Save $96"
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
          {/* Pro Plan */}
          <PlanCard
            title="Pro"
            price={`USD ${planPrices.pro[selectedPlan]}/month`}
            buttonText="Upgrade to Pro"
            buttonLoading={loadingPlan === "pro"}
            onButtonClick={() => handleUpgradeClick("pro")}
            savingsNote={getYearlySavingsNote("pro")}
          >
            <PlanStatement>Early access to new features</PlanStatement>
            <PlanStatement>
              Access to PGPT-Large, GPT-4o, PGPT-Small
            </PlanStatement>
            <PlanStatement>
              Access to file uploads, vision, web search and browsing
            </PlanStatement>
            <PlanStatement>
              Access to advanced plugins like SQLi Exploiter, XSS Exploiter, and
              more
            </PlanStatement>
            <PlanStatement>Access to terminal</PlanStatement>
          </PlanCard>

          {/* Team Plan */}
          <PlanCard
            title="Team"
            price={`USD ${planPrices.team[selectedPlan]} per person/month`}
            buttonText="Upgrade to Team"
            buttonLoading={loadingPlan === "team"}
            onButtonClick={() => handleUpgradeClick("team")}
            savingsNote={getYearlySavingsNote("team")}
          >
            <PlanStatement>Everything in Pro</PlanStatement>
            <PlanStatement>Higher usage limits versus Pro plan</PlanStatement>
            <PlanStatement>Central billing and administration</PlanStatement>
          </PlanCard>
        </div>
      </div>
      <div className="h-16"></div> {/* Increased footer space */}
    </div>
  )
}

interface PlanCardProps {
  title: string
  price: string
  buttonText: string
  buttonLoading?: boolean
  onButtonClick?: () => void
  savingsNote?: string
  children: React.ReactNode
  buttonDisabled?: boolean
}

const PlanCard: FC<PlanCardProps> = ({
  title,
  price,
  buttonText,
  buttonLoading,
  onButtonClick,
  savingsNote,
  children,
  buttonDisabled
}) => (
  <div className="bg-popover border-primary/20 flex flex-col rounded-lg border p-6 text-left shadow-md">
    <div className="mb-4">
      <h2 className="flex items-center text-xl font-bold">
        {title === "Pro" ? (
          <Sparkles className="mr-2" size={18} />
        ) : (
          <Users className="mr-2" size={18} />
        )}
        {title}
      </h2>
      <p className="text-muted-foreground mt-1">{price}</p>
      {savingsNote && (
        <p className="mt-1 text-sm font-medium text-green-500">{savingsNote}</p>
      )}
    </div>
    <Button
      variant="default"
      onClick={onButtonClick}
      disabled={buttonLoading || buttonDisabled}
      className="mb-6 w-full"
    >
      {buttonLoading && <IconLoader2 size={22} className="mr-2 animate-spin" />}
      <span>{buttonText}</span>
    </Button>
    <div className="grow space-y-3">{children}</div>
    {title === "Pro" && (
      <div className="mb-1 mt-6 text-left">
        <a
          href="https://help.hackerai.co/en/articles/9982061-what-is-pentestgpt-pro"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 text-xs font-medium underline"
        >
          Learn more about usage limits and FAQs
        </a>
      </div>
    )}
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
