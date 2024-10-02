import { getRedis } from "./redis"

const PASSWORD_RESET_PREFIX = "password_reset_ratelimit:"
const MAX_PASSWORD_RESET_ATTEMPTS = 5
const PASSWORD_RESET_WINDOW_SIZE_MS = 60 * 60 * 1000 // 1 hour

export async function checkPasswordResetRateLimit(
  email: string,
  ip: string
): Promise<{ success: boolean }> {
  const redis = getRedis()
  const now = Date.now()
  const windowStart = now - PASSWORD_RESET_WINDOW_SIZE_MS

  const emailKey = `${PASSWORD_RESET_PREFIX}email:${email}`
  const ipKey = `${PASSWORD_RESET_PREFIX}ip:${ip}`

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(emailKey, 0, windowStart)
  pipeline.zcard(emailKey)
  pipeline.zadd(emailKey, { score: now, member: now.toString() })
  pipeline.expire(emailKey, Math.ceil(PASSWORD_RESET_WINDOW_SIZE_MS / 1000))

  pipeline.zremrangebyscore(ipKey, 0, windowStart)
  pipeline.zcard(ipKey)
  pipeline.zadd(ipKey, { score: now, member: now.toString() })
  pipeline.expire(ipKey, Math.ceil(PASSWORD_RESET_WINDOW_SIZE_MS / 1000))

  const [, emailCount, , , , ipCount] = (await pipeline.exec()) as [
    any,
    number,
    any,
    any,
    any,
    number
  ]

  const isAllowed =
    emailCount < MAX_PASSWORD_RESET_ATTEMPTS &&
    ipCount < MAX_PASSWORD_RESET_ATTEMPTS

  return { success: isAllowed }
}
