type RateLimitInput = {
  actorId: string;
  source: string;
};

type Attempt = {
  timestamps: number[];
};

export interface ProvisioningRateLimiter {
  check(input: RateLimitInput): {
    allowed: boolean;
    retryAfterSeconds: number;
  };
  reset(): void;
}

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_WINDOW = 10;

class InMemoryProvisioningRateLimiter implements ProvisioningRateLimiter {
  private readonly attempts = new Map<string, Attempt>();

  check(input: RateLimitInput) {
    const now = Date.now();
    const keys = ["actor:" + input.actorId, "source:" + input.source];
    let retryAfterSeconds = 0;

    for (const key of keys) {
      const current = this.attempts.get(key)?.timestamps ?? [];
      const active = current.filter((timestamp) => timestamp > now - WINDOW_MS);

      if (active.length >= MAX_ATTEMPTS_PER_WINDOW) {
        retryAfterSeconds = Math.max(
          retryAfterSeconds,
          Math.ceil((active[0] + WINDOW_MS - now) / 1000),
        );
      }
    }

    if (retryAfterSeconds > 0) {
      return { allowed: false, retryAfterSeconds };
    }

    for (const key of keys) {
      const current = this.attempts.get(key)?.timestamps ?? [];
      this.attempts.set(key, {
        timestamps: [
          ...current.filter((timestamp) => timestamp > now - WINDOW_MS),
          now,
        ],
      });
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  reset() {
    this.attempts.clear();
  }
}

export const platformProvisioningRateLimiter: ProvisioningRateLimiter =
  new InMemoryProvisioningRateLimiter();

export const provisioningRequestSource = (req: any): string =>
  String(
    req.ip ??
      req.socket?.remoteAddress ??
      req.headers?.["x-real-ip"] ??
      "unknown",
  )
    .replace(/^::ffff:/, "")
    .slice(0, 100);
