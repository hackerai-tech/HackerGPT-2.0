"use client"

import { FC, useState, useContext, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react"
import * as Sentry from "@sentry/nextjs"
import Loading from "@/app/loading"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/browser-client"
import { getCheckoutUrl } from "@/lib/server/stripe-url"
import PentestGPTTextSVG from "@/components/icons/pentestgpt-text-svg"
import { useTheme } from "next-themes"
import { PentestGPTContext } from "@/context/context"
import { getSubscriptionByUserId } from "@/db/subscriptions"

const MONTHLY_TEAM_PRICE_ID =
  process.env.NEXT_PUBLIC_STRIPE_MONTHLY_TEAM_PRICE_ID
const YEARLY_TEAM_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_YEARLY_TEAM_PRICE_ID
const MAX_TEAM_NAME_LENGTH = 25

const NewTeamPage: FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, userEmail } = useContext(PentestGPTContext)
  const [teamName, setTeamName] = useState("")
  const [isYearly, setIsYearly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [seatQuantity, setSeatQuantity] = useState(1)
  const { theme } = useTheme()

  useEffect(() => {
    const checkSubscription = async () => {
      if (profile) {
        try {
          const subscription = await getSubscriptionByUserId(profile.user_id)

          if (subscription) {
            router.push("/login")
            return
          }
        } catch (error) {
          console.error("Error checking subscription:", error)
          toast.error("Failed to check subscription status. Please try again.")
        } finally {
          setIsLoading(false)
        }
      }
    }

    checkSubscription()
  }, [profile, router])

  useEffect(() => {
    const yearlyParam = searchParams.get("yearly")
    setIsYearly(yearlyParam === "true")
  }, [searchParams])

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name")
      return
    }

    if (teamName.length > MAX_TEAM_NAME_LENGTH) {
      toast.error(
        `Team name must be ${MAX_TEAM_NAME_LENGTH} characters or less`
      )
      return
    }

    if (seatQuantity < 1) {
      toast.error("Seat quantity must be at least 1")
      return
    }

    setIsLoading(true)

    try {
      const priceId = isYearly ? YEARLY_TEAM_PRICE_ID : MONTHLY_TEAM_PRICE_ID
      const result = await getCheckoutUrl(priceId, teamName, seatQuantity)

      if (result.type === "error") {
        throw new Error(result.error.message)
      }

      // Redirect to the checkout page
      router.push(result.value)
    } catch (error) {
      Sentry.captureException(error)
      toast.error("Failed to create team. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" })
    router.push("/login")
    router.refresh()
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
          onClick={() => router.push("/upgrade")}
          className="absolute left-4 p-2"
          aria-label="Back"
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
        <div className="bg-popover border-primary/20 w-full max-w-md rounded-lg border p-8 shadow-md">
          <h1 className="mb-8 text-center text-2xl font-semibold md:text-3xl">
            Create a Team
          </h1>

          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground mb-2">
                You are currently logged in as:
              </p>
              <p className="truncate font-semibold" title={userEmail}>
                {userEmail}
              </p>
            </div>

            <div>
              <label
                htmlFor="teamName"
                className="text-muted-foreground mb-2 block"
              >
                Team name
              </label>
              <Input
                id="teamName"
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="Enter your team name"
                maxLength={MAX_TEAM_NAME_LENGTH}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {teamName.length}/{MAX_TEAM_NAME_LENGTH} characters
              </p>
            </div>

            <div>
              <label
                htmlFor="seatQuantity"
                className="text-muted-foreground mb-2 block"
              >
                Number of users
              </label>
              <Input
                id="seatQuantity"
                type="number"
                value={seatQuantity}
                onChange={e =>
                  setSeatQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                min="1"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Yearly billing</span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            </div>

            <Button
              onClick={handleCreateTeam}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <IconLoader2 size={22} className="mr-2 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                `Create Team - ${isYearly ? "$384" : "$40"} / user / ${isYearly ? "year" : "month"}`
              )}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full"
            >
              Login with a different account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewTeamPage
