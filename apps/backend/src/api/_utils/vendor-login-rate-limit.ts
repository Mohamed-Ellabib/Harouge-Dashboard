export type VendorLoginRateLimitInput = {
  source: string
  identifier: string
}

export type VendorLoginRateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

export interface VendorLoginRateLimiter {
  check(input: VendorLoginRateLimitInput): VendorLoginRateLimitResult
  recordFailure(input: VendorLoginRateLimitInput): void
  recordSuccess(input: VendorLoginRateLimitInput): void
}

type RateLimitPolicy = {
  limit: number
  windowMs: number
}

const POLICIES: RateLimitPolicy[] = [
  { limit: 5, windowMs: 60_000 },
  { limit: 20, windowMs: 15 * 60_000 },
]
const DEFAULT_MAX_TRACKED_KEYS = 10_000

export class InMemoryVendorLoginRateLimiter implements VendorLoginRateLimiter {
  private readonly attempts = new Map<string, number[]>()

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxTrackedKeys = DEFAULT_MAX_TRACKED_KEYS
  ) {}

  check(input: VendorLoginRateLimitInput): VendorLoginRateLimitResult {
    const now = this.now()
    let retryAfterMs = 0

    for (const key of this.keys(input)) {
      for (const policy of POLICIES) {
        const attempts = this.recentAttempts(key, policy.windowMs, now)

        if (attempts.length >= policy.limit) {
          retryAfterMs = Math.max(
            retryAfterMs,
            attempts[0] + policy.windowMs - now
          )
        }
      }
    }

    return {
      allowed: retryAfterMs <= 0,
      retryAfterSeconds: Math.max(0, Math.ceil(retryAfterMs / 1000)),
    }
  }

  recordFailure(input: VendorLoginRateLimitInput): void {
    const now = this.now()
    const longestWindow = Math.max(...POLICIES.map((policy) => policy.windowMs))

    for (const key of this.keys(input)) {
      const attempts = this.recentAttempts(key, longestWindow, now)
      attempts.push(now)
      this.storeAttempts(key, attempts)
    }
  }

  recordSuccess(input: VendorLoginRateLimitInput): void {
    for (const key of [...this.attempts.keys()]) {
      if (key.startsWith(`identifier:${input.identifier}:`)) {
        this.attempts.delete(key)
      }
    }
  }

  reset(): void {
    this.attempts.clear()
  }

  trackedKeyCount(): number {
    return this.attempts.size
  }

  private keys(input: VendorLoginRateLimitInput): string[] {
    return [
      ...POLICIES.map((policy) => this.key("source", input.source, policy)),
      ...POLICIES.map((policy) =>
        this.key("identifier", input.identifier, policy)
      ),
    ]
  }

  private key(
    kind: "source" | "identifier",
    value: string,
    policy: RateLimitPolicy
  ): string {
    return `${kind}:${value}:${policy.limit}:${policy.windowMs}`
  }

  private recentAttempts(key: string, windowMs: number, now: number): number[] {
    const cutoff = now - windowMs
    const attempts = (this.attempts.get(key) ?? []).filter(
      (timestamp) => timestamp > cutoff
    )

    if (attempts.length) {
      this.attempts.set(key, attempts)
    } else {
      this.attempts.delete(key)
    }

    return attempts
  }

  private storeAttempts(key: string, attempts: number[]): void {
    if (!this.attempts.has(key)) {
      while (this.attempts.size >= this.maxTrackedKeys) {
        const oldestKey = this.attempts.keys().next().value

        if (typeof oldestKey !== "string") {
          break
        }

        this.attempts.delete(oldestKey)
      }
    }

    this.attempts.set(key, attempts)
  }
}

// Development default only. Production replicas must use a shared Redis-backed implementation.
export const vendorLoginRateLimiter = new InMemoryVendorLoginRateLimiter()

export const getVendorLoginSource = (req: any): string => {
  return String(
    req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? req.ip ?? "unknown"
  )
}
