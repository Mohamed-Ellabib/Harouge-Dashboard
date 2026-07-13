import { InMemoryVendorLoginRateLimiter } from "../vendor-login-rate-limit"

describe("vendor login rate limiter", () => {
  let now = 1_000_000
  let limiter: InMemoryVendorLoginRateLimiter

  beforeEach(() => {
    now = 1_000_000
    limiter = new InMemoryVendorLoginRateLimiter(() => now)
  })

  it("limits repeated failures from one source", () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      limiter.recordFailure({ source: "ip-a", identifier: `user-${attempt}` })
    }

    expect(
      limiter.check({ source: "ip-a", identifier: "another-user" }).allowed
    ).toBe(false)
  })

  it("limits repeated failures for one normalized identifier", () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      limiter.recordFailure({ source: `ip-${attempt}`, identifier: "a@test.dev" })
    }

    expect(
      limiter.check({ source: "new-ip", identifier: "a@test.dev" }).allowed
    ).toBe(false)
  })

  it("allows attempts after the short window expires", () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      limiter.recordFailure({ source: "ip-a", identifier: "a@test.dev" })
    }

    now += 60_001

    expect(
      limiter.check({ source: "ip-a", identifier: "a@test.dev" }).allowed
    ).toBe(true)
  })

  it("clears identifier failures after successful authentication", () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      limiter.recordFailure({ source: `ip-${attempt}`, identifier: "a@test.dev" })
    }

    limiter.recordSuccess({ source: "ip-success", identifier: "a@test.dev" })

    expect(
      limiter.check({ source: "new-ip", identifier: "a@test.dev" }).allowed
    ).toBe(true)
  })

  it("bounds tracked keys for arbitrary failed identifiers", () => {
    limiter = new InMemoryVendorLoginRateLimiter(() => now, 8)

    for (let attempt = 0; attempt < 20; attempt++) {
      limiter.recordFailure({
        source: `ip-${attempt}`,
        identifier: `user-${attempt}@test.dev`,
      })
    }

    expect(limiter.trackedKeyCount()).toBeLessThanOrEqual(8)
  })
})
