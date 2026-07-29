import {
  commerceSetupRequestHash,
  normalizeCommerceSetupInput,
  normalizeCommerceSetupPinnedPolicy,
  normalizeCommerceSetupRequest,
  normalizeStoreProfileId,
} from "../commerce-readiness-contract"

describe("commerce readiness contract", () => {
  const originalSecrets = {
    VENDOR_SESSION_SECRET: process.env.VENDOR_SESSION_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
  }
  const pinnedPolicy = (overrides: Record<string, unknown> = {}) =>
    normalizeCommerceSetupPinnedPolicy({
      version: 1,
      provisioning_id: "stprov_01PINNED",
      tenant_id: "tenant_01PINNED",
      store_profile_id: "stprof_01ABC",
      medusa_store_id: "store_01PINNED",
      plan_code: "professional_commerce",
      region_id: "reg_01PINNED",
      stock_location_id: "sloc_01PINNED",
      sales_channel_id: "sc_01PINNED",
      currency_code: "LYD",
      countries: ["tn", "ly", "ly"],
      fulfillment_provider_id: "manual_manual",
      payment_provider_id: "pp_system_default",
      ...overrides,
    })

  afterAll(() => {
    for (const [name, value] of Object.entries(originalSecrets)) {
      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }
  })

  it("normalizes only the operator-controlled shipping policy", () => {
    expect(
      normalizeCommerceSetupRequest({
        idempotency_key: " Commerce:Setup:0001 ",
        store_profile_id: "stprof_01ABC",
        request: {
          shipping_option: {
            name: "  Standard delivery  ",
            description: "  Delivery in the configured service area.  ",
            amount: 1250,
          },
        },
        pinned_policy: pinnedPolicy(),
      }),
    ).toMatchObject({
      idempotencyKey: "commerce:setup:0001",
      storeProfileId: "stprof_01ABC",
      request: {
        shipping_option: {
          name: "Standard delivery",
          description: "Delivery in the configured service area.",
          amount: 1250,
        },
      },
      pinnedPolicy: expect.objectContaining({
        currency_code: "lyd",
        countries: ["ly", "tn"],
      }),
    })
  })

  it("rejects provider, currency, countries, and internal identifiers", () => {
    expect(() =>
      normalizeCommerceSetupInput({
        shipping_option: {
          name: "Standard delivery",
          amount: 0,
          provider_id: "attacker-provider",
          currency_code: "usd",
          region_id: "reg_attacker",
        },
      }),
    ).toThrow()
  })

  it("requires a canonical StoreProfile identifier", () => {
    expect(() => normalizeStoreProfileId("vendor_123")).toThrow(
      /StoreProfile identifier/i,
    )
    expect(normalizeStoreProfileId("stprof_01ABC")).toBe("stprof_01ABC")
  })

  it("digests the Store target and normalized policy", () => {
    const request = normalizeCommerceSetupInput({
      shipping_option: { name: "Standard", amount: 500 },
    })
    const policy = pinnedPolicy()
    const first = commerceSetupRequestHash("stprof_01ABC", request, policy)
    const replay = commerceSetupRequestHash("stprof_01ABC", request, policy)
    const otherStore = commerceSetupRequestHash(
      "stprof_02XYZ",
      request,
      pinnedPolicy({ store_profile_id: "stprof_02XYZ" }),
    )
    const otherRegion = commerceSetupRequestHash(
      "stprof_01ABC",
      request,
      pinnedPolicy({ region_id: "reg_02CHANGED" }),
    )
    const otherCountries = commerceSetupRequestHash(
      "stprof_01ABC",
      request,
      pinnedPolicy({ countries: ["ly"] }),
    )
    const otherProvider = commerceSetupRequestHash(
      "stprof_01ABC",
      request,
      pinnedPolicy({ payment_provider_id: "pp_changed" }),
    )

    expect(first).toBe(replay)
    expect(first).not.toBe(otherStore)
    expect(first).not.toBe(otherRegion)
    expect(first).not.toBe(otherCountries)
    expect(first).not.toBe(otherProvider)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
  })

  it("keeps same-key replay stable across auth and session secret rotation", () => {
    const request = {
      idempotency_key: "commerce:setup:secret-rotation",
      store_profile_id: "stprof_01ABC",
      request: {
        shipping_option: { name: "Standard", amount: 500 },
      },
      pinned_policy: pinnedPolicy(),
    }
    const digest = () => normalizeCommerceSetupRequest(request).requestHash

    process.env.VENDOR_SESSION_SECRET = "vendor-secret-before-rotation"
    process.env.JWT_SECRET = "jwt-secret-before-rotation"
    process.env.COOKIE_SECRET = "cookie-secret-before-rotation"
    const vendorPriority = digest()

    process.env.VENDOR_SESSION_SECRET = "vendor-secret-after-rotation"
    const rotatedVendor = digest()

    delete process.env.VENDOR_SESSION_SECRET
    process.env.JWT_SECRET = "jwt-secret-after-priority-change"
    const jwtPriority = digest()

    delete process.env.JWT_SECRET
    process.env.COOKIE_SECRET = "cookie-secret-after-priority-change"
    const cookiePriority = digest()

    delete process.env.COOKIE_SECRET
    const noAuthSecrets = digest()

    expect(rotatedVendor).toBe(vendorPriority)
    expect(jwtPriority).toBe(vendorPriority)
    expect(cookiePriority).toBe(vendorPriority)
    expect(noAuthSecrets).toBe(vendorPriority)
  })

  it("requires a server-derived permanent policy pin", () => {
    expect(() =>
      normalizeCommerceSetupRequest({
        idempotency_key: "commerce:setup:missing-policy",
        store_profile_id: "stprof_01ABC",
        request: {
          shipping_option: { name: "Standard", amount: 500 },
        },
      }),
    ).toThrow(/permanent Store commerce policy/i)
  })
})
