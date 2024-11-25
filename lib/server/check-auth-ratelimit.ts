import { getRedis } from "./redis"

const AUTH_PREFIX = "auth_ratelimit:"
const MAX_LOGIN_ATTEMPTS = 7
const MAX_SIGNUP_ATTEMPTS = 5
const MAX_PASSWORD_RESET_ATTEMPTS = 3
const AUTH_WINDOW_SIZE_MS = 15 * 60 * 1000 // 15 minutes
const PASSWORD_RESET_WINDOW_SIZE_MS = 60 * 60 * 1000 // 1 hour

export async function checkAuthRateLimit(
  email: string,
  ip: string,
  action: "login" | "signup" | "password-reset"
): Promise<{ success: boolean }> {
  const redis = getRedis()
  const now = Date.now()
  const windowSize =
    action === "password-reset"
      ? PASSWORD_RESET_WINDOW_SIZE_MS
      : AUTH_WINDOW_SIZE_MS
  const windowStart = now - windowSize

  const emailKey = `${AUTH_PREFIX}${action}:email:${email}`
  const ipKey = `${AUTH_PREFIX}${action}:ip:${ip}`

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(emailKey, 0, windowStart)
  pipeline.zcard(emailKey)
  pipeline.zremrangebyscore(ipKey, 0, windowStart)
  pipeline.zcard(ipKey)

  const [, emailCount, , ipCount] = (await pipeline.exec()) as [
    any,
    number,
    any,
    number
  ]

  let maxAttempts: number
  switch (action) {
    case "login":
      maxAttempts = MAX_LOGIN_ATTEMPTS
      break
    case "signup":
      maxAttempts = MAX_SIGNUP_ATTEMPTS
      break
    case "password-reset":
      maxAttempts = MAX_PASSWORD_RESET_ATTEMPTS
      break
  }

  const isAllowed = emailCount < maxAttempts && ipCount < maxAttempts

  if (isAllowed) {
    // Only add new score if the limit hasn't been reached
    pipeline.zadd(emailKey, { score: now, member: now.toString() })
    pipeline.zadd(ipKey, { score: now, member: now.toString() })
    pipeline.expire(emailKey, Math.ceil(windowSize / 1000))
    pipeline.expire(ipKey, Math.ceil(windowSize / 1000))
    await pipeline.exec()
  }

  return { success: isAllowed }
}
