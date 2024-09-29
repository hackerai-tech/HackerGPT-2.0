// Usage:
// bun ./scripts/ratelimit/request.ts <userId> <numOfRequests>`
//
// Caution:
// This script is for testing the rate limiter.
// It will make a lot of requests to the redis server.
import { _ratelimit } from "@/lib/server/ratelimiter"
import { SubscriptionInfo, SubscriptionStatus } from "@/types"


async function main(model: string, userId: string, count: number, subscriptionStatus: SubscriptionStatus = "free") {
  const subscriptionInfo: SubscriptionInfo = {
    isPremium: subscriptionStatus !== "free",
    status: subscriptionStatus
  }

  for (let i = 0; i < count; i++) {
    const result = await _ratelimit(model, userId, subscriptionInfo)
    console.log(result)
  }
}

const model = process.argv.slice(2)[0]
const userId = process.argv.slice(2)[1]
const numOfRequests = Number(process.argv.slice(2)[2])
if (!userId || !model || numOfRequests <= 0 || isNaN(numOfRequests)) {
  console.error(
    "Usage: bun ./scripts/ratelimit/request.ts <model> <userId> <numOfRequests>"
  )
  process.exit(1)
}
await main(model, userId, numOfRequests)
