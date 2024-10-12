import { getServerUserAndProfile } from "@/lib/server/server-chat-helpers"
import { createSupabaseAdminClient } from "@/lib/server/server-utils"
import {
  getActiveSubscriptions,
  getCustomersByEmail,
  getStripe,
  isRestoreableSubscription
} from "@/lib/server/stripe"
import { unixToDateString } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { User } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST() {
  try {
    const { user } = await getServerUserAndProfile()

    const stripe = getStripe()
    const email = user.email

    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 }
      )
    }

    const customers = await getCustomersByEmail(stripe, email)
    if (customers.length === 0) {
      return NextResponse.json(
        { message: "You have no subscription to restore." },
        { status: 200 }
      )
    }

    for (const customer of customers) {
      const subscriptions = await getActiveSubscriptions(stripe, customer.id)
      for (const subscription of subscriptions.data) {
        if (isRestoreableSubscription(subscription)) {
          const restoredItem = await restoreToDatabase(
            stripe,
            user,
            subscription.id
          )
          if (restoredItem.type === "error") {
            return NextResponse.json(
              { error: restoredItem.error },
              { status: 400 }
            )
          }
          return NextResponse.json(
            { subscription: restoredItem.value },
            { status: 200 }
          )
        }
      }
    }

    return NextResponse.json(
      { message: "No subscription to restore" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error restoring subscription:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

async function restoreToDatabase(
  stripe: Stripe,
  user: User,
  subscriptionId: string
): Promise<
  | { type: "error"; error: string }
  | { type: "ok"; value: Tables<"subscriptions"> }
> {
  const supabaseAdmin = createSupabaseAdminClient()

  // Retrieve the subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Ensure the subscription has a valid customer ID from Stripe
  if (!subscription.customer || typeof subscription.customer !== "string") {
    return { type: "error", error: "invalid customer value" }
  }

  // Determine the plan type and team name
  const planType = subscription.metadata.teamName ? "team" : "pro"
  const teamName = subscription.metadata.teamName || null

  // Get the quantity (number of seats) for team plans
  const quantity = subscription.items.data[0].quantity || 1
  // Check if the subscription already exists in the database
  const existingSubscription = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .single()

  let result
  if (existingSubscription.data) {
    // If the subscription exists, update it
    result = await supabaseAdmin
      .from("subscriptions")
      .update({
        user_id: user.id,
        customer_id: subscription.customer,
        status: subscription.status,
        start_date: unixToDateString(subscription.current_period_start),
        cancel_at: subscription.cancel_at
          ? unixToDateString(subscription.cancel_at)
          : null,
        canceled_at: subscription.canceled_at
          ? unixToDateString(subscription.canceled_at)
          : null,
        ended_at: subscription.ended_at
          ? unixToDateString(subscription.ended_at)
          : null,
        plan_type: planType,
        team_name: teamName,
        quantity: quantity
      })
      .eq("subscription_id", subscriptionId)
  } else {
    // If the subscription doesn't exist, insert it
    result = await supabaseAdmin.from("subscriptions").insert({
      subscription_id: subscriptionId,
      user_id: user.id,
      customer_id: subscription.customer,
      status: subscription.status,
      start_date: unixToDateString(subscription.current_period_start),
      cancel_at: subscription.cancel_at
        ? unixToDateString(subscription.cancel_at)
        : null,
      canceled_at: subscription.canceled_at
        ? unixToDateString(subscription.canceled_at)
        : null,
      ended_at: subscription.ended_at
        ? unixToDateString(subscription.ended_at)
        : null,
      plan_type: planType,
      team_name: teamName,
      quantity: quantity
    })
  }
  if (result.error) {
    console.error(result.error)
    return { type: "error", error: "error upserting subscription" }
  }

  // Retrieve and return the newly restored subscription from Supabase
  const newSubscription = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("status", "active")
    .eq("user_id", user.id)
    .single()
  if (newSubscription.error) {
    console.error(newSubscription.error)
    return { type: "error", error: "error fetching new subscription" }
  }
  return { type: "ok", value: newSubscription.data }
}
