import {
  entitlementsForPlan,
  normalizeProvisionStoreInput,
  provisioningRequestHash,
  safeRequestSnapshot,
  temporaryDomainForHandle,
} from "../provisioning-contract";

const validRequest = () => ({
  tenant: {
    name: "Test Tenant",
    key: "test-tenant",
    reuse_existing: false,
  },
  store: {
    name: "Test Store",
    handle: "test-store",
    plan_code: "starter_whatsapp",
    locale: "ar-LY",
    timezone: "Africa/Tripoli",
    currency_code: "LYD",
    status_after_provisioning: "active",
  },
  owner: {
    email: "Owner@Example.Test",
    display_name: "Test Owner",
    initial_password: "Synthetic-Test-Passphrase-Only",
    reuse_existing_account: false,
  },
  brand: {
    logo_url: "https://cdn.example.test/logo.png",
    primary_color: "#1257A6",
  },
  commerce: {
    region_name: "Libya",
    countries: ["LY"],
    stock_location_name: "Tripoli Stock",
    sales_channel_name: "Test Web",
  },
  contact: {
    public_email: "Public@Example.Test",
  },
  domain: {
    custom_hostname: "shop.example.test",
  },
});

describe("Phase 2C provisioning input contract", () => {
  beforeAll(() => {
    process.env.VENDOR_SESSION_SECRET =
      "phase-2c-unit-secret-not-for-production";
    process.env.SAAS_TEMPORARY_DOMAIN_BASE = "local.test";
  });

  it("normalizes a valid Starter request deterministically", () => {
    const result = normalizeProvisionStoreInput(validRequest());

    expect(result.store.handle).toBe("test-store");
    expect(result.store.currency_code).toBe("lyd");
    expect(result.owner.email).toBe("owner@example.test");
    expect(result.commerce.countries).toEqual(["ly"]);
  });

  it("accepts the Professional plan and centralizes its entitlements", () => {
    const request = validRequest();
    request.store.plan_code = "professional_commerce";
    const result = normalizeProvisionStoreInput(request);

    expect(result.store.plan_code).toBe("professional_commerce");
    expect(entitlementsForPlan(result.store.plan_code)).toContain(
      "cart_checkout",
    );
  });

  it.each([
    ["invalid handle", { store: { handle: "---" } }],
    ["invalid email", { owner: { email: "not-an-email" } }],
    [
      "private brand URL",
      { brand: { logo_url: "https://127.0.0.1/logo.png" } },
    ],
    ["invalid plan", { store: { plan_code: "enterprise" } }],
    ["unsupported currency", { store: { currency_code: "ZZZ" } }],
    ["invalid locale", { store: { locale: "not_a_locale_@" } }],
    ["invalid timezone", { store: { timezone: "Mars/Olympus" } }],
    [
      "invalid domain",
      { domain: { custom_hostname: "https://shop.example.test/path" } },
    ],
  ])("rejects %s", (_name, replacement) => {
    const request = validRequest() as any;

    for (const [section, values] of Object.entries(replacement)) {
      request[section] = { ...request[section], ...(values as object) };
    }

    expect(() => normalizeProvisionStoreInput(request)).toThrow();
  });

  it("rejects hostile internal identifiers", () => {
    expect(() =>
      normalizeProvisionStoreInput({
        ...validRequest(),
        store_id: "store_hostile",
        sales_channel_id: "sc_hostile",
      }),
    ).toThrow();
  });

  it("requires explicit account reuse and excludes credentials from snapshots", () => {
    const normalized = normalizeProvisionStoreInput(validRequest());
    const snapshot = safeRequestSnapshot(normalized);
    const serialized = JSON.stringify(snapshot);

    expect(serialized).not.toContain(
      normalized.owner.initial_password as string,
    );
    expect(serialized).not.toContain("password_hash");
    expect((snapshot.owner as any).initial_password_provided).toBe(true);
  });

  it("fingerprints material input without exposing the password", () => {
    const first = normalizeProvisionStoreInput(validRequest());
    const secondRequest = validRequest();
    secondRequest.store.name = "Different Store";
    const second = normalizeProvisionStoreInput(secondRequest);

    expect(provisioningRequestHash(first)).not.toBe(
      provisioningRequestHash(second),
    );
    expect(provisioningRequestHash(first)).not.toContain(
      first.owner.initial_password as string,
    );
  });

  it("derives the temporary hostname from configuration", () => {
    expect(temporaryDomainForHandle("test-store")).toBe(
      "test-store.local.test",
    );
  });
});
