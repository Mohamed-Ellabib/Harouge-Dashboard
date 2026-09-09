import { medusaIntegrationTestRunner } from "@medusajs/test-utils";

import { vendorLoginRateLimiter } from "../../src/api/_utils/vendor-login-rate-limit";
import {
  createSecurityFixtures,
  type SecurityFixtures,
} from "../helpers/security-fixtures";

const testEnv = {
  NODE_ENV: "test",
  JWT_SECRET: "test-only-jwt-secret-not-for-production",
  COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
  VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
  STORE_CORS: "http://127.0.0.1:8000",
  ADMIN_CORS: "http://127.0.0.1:9000",
  AUTH_CORS: "http://127.0.0.1:5175",
};

const cookieFrom = (response: any): string => {
  const setCookie = response.headers["set-cookie"]?.[0];

  if (!setCookie) {
    throw new Error("Merchant login did not return a session cookie.");
  }

  return setCookie.split(";")[0];
};

const collectKeys = (value: unknown, keys = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectKeys(entry, keys);
    }

    return keys;
  }

  if (!value || typeof value !== "object") {
    return keys;
  }

  for (const [key, entry] of Object.entries(value)) {
    keys.add(key);
    collectKeys(entry, keys);
  }

  return keys;
};

const collectKeyPaths = (
  value: unknown,
  predicate: (key: string) => boolean,
  path = "$",
  matches = new Set<string>(),
): Set<string> => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectKeyPaths(entry, predicate, `${path}[]`, matches);
    }

    return matches;
  }

  if (!value || typeof value !== "object") {
    return matches;
  }

  for (const [key, entry] of Object.entries(value)) {
    const entryPath = `${path}.${key}`;

    if (predicate(key)) {
      matches.add(entryPath);
    }

    collectKeyPaths(entry, predicate, entryPath, matches);
  }

  return matches;
};

const containsAnyValue = (payload: unknown, values: unknown[]): boolean => {
  const serialized = JSON.stringify(payload);

  return values.some(
    (value) =>
      typeof value === "string" &&
      value.length > 0 &&
      serialized.includes(value),
  );
};

const expectSafePublicPayload = (
  payload: unknown,
  fixtures: SecurityFixtures,
): void => {
  const keys = [...collectKeys(payload)];
  const forbiddenExactKeys = new Set([
    "metadata",
    "contact_email",
    "email",
    "tenant_id",
    "tenantId",
    "store_profile_id",
    "storeProfileId",
    "medusa_store_id",
    "medusaStoreId",
    "legacy_vendor_id",
    "vendor_id",
    "publishable_api_key_id",
  ]);
  const isForbiddenKey = (key: string) =>
    forbiddenExactKeys.has(key) ||
    /(?:password|secret|credential|authorization|cookie|(?:^|_)token(?:$|_))/i.test(
      key,
    );
  const forbiddenKeys = keys.filter(isForbiddenKey);
  const forbiddenKeyPaths = [
    ...collectKeyPaths(payload, isForbiddenKey),
  ].sort();
  const hasForbiddenValue = containsAnyValue(payload, [
    fixtures.memberA.email,
    fixtures.memberB.email,
    fixtures.memberA.metadata?.password_hash,
    fixtures.memberB.metadata?.password_hash,
    fixtures.tenantA.id,
    fixtures.tenantB.id,
    fixtures.storeProfileA.id,
    fixtures.storeProfileB.id,
    fixtures.medusaStoreA.id,
    fixtures.medusaStoreB.id,
    fixtures.vendorA.id,
    fixtures.vendorB.id,
    fixtures.memberA.id,
    fixtures.memberB.id,
    fixtures.apiKeyA.id,
    fixtures.apiKeyB.id,
    fixtures.apiKeyA.token,
    fixtures.apiKeyB.token,
  ]);

  expect(forbiddenKeys.sort()).toEqual([]);
  expect(forbiddenKeyPaths).toEqual([]);
  expect(hasForbiddenValue).toBe(false);
};

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: testEnv,
  testSuite: ({ api, getContainer }) => {
    describe("Phase 3 storefront foundation HTTP acceptance", () => {
      let fixtures: SecurityFixtures;

      beforeEach(async () => {
        vendorLoginRateLimiter.reset();
        fixtures = await createSecurityFixtures(getContainer());
      });

      const headersFor = (store: "a" | "b") => ({
        Host: store === "a" ? "store-a.example.test" : "store-b.example.test",
        "x-publishable-api-key":
          store === "a" ? fixtures.apiKeyA.token : fixtures.apiKeyB.token,
      });

      const login = async (store: "a" | "b") => {
        const member = store === "a" ? fixtures.memberA : fixtures.memberB;
        const password =
          store === "a" ? fixtures.passwordA : fixtures.passwordB;

        return cookieFrom(
          await api.post("/vendor/auth/login", {
            email: member.email,
            password,
          }),
        );
      };

      const createProduct = async (
        store: "a" | "b",
        title: string,
        handle: string,
        status: "draft" | "published",
      ) =>
        (
          await api.post(
            "/vendor/products",
            {
              title,
              handle,
              status,
              price: store === "a" ? 1500 : 2200,
              currency_code: "lyd",
            },
            { headers: { Cookie: await login(store) } },
          )
        ).data.product;

      it("binds safe public profiles to the exact hostname and key", async () => {
        const resolve = (host: string, key: string, query = "") =>
          api.get(`/store/vendors/resolve${query}`, {
            headers: {
              Host: host,
              "x-publishable-api-key": key,
            },
            validateStatus: () => true,
          });

        const profileA = await resolve(
          "store-a.example.test",
          fixtures.apiKeyA.token,
          "?domain=store-b.example.test&store=phase-05-store-b",
        );
        const profileB = await resolve(
          "store-b.example.test",
          fixtures.apiKeyB.token,
        );

        expect(profileA.status).toBe(200);
        expect(profileB.status).toBe(200);
        expect(profileA.data.vendor).toEqual({
          name: fixtures.vendorA.name,
          handle: fixtures.vendorA.handle,
          domain: "store-a.example.test",
          locale: "ar-LY",
          contact: {
            public_email: fixtures.storeProfileA.public_contact_email ?? null,
            public_phone: null,
            whatsapp_number: null,
          },
          branding: {
            logo_url: fixtures.vendorA.logo_url,
            primary_color: fixtures.vendorA.primary_color,
            secondary_color: null,
            typography_key: "cairo",
          },
          storefront: null,
        });
        expect(profileB.data.vendor).toEqual({
          name: fixtures.vendorB.name,
          handle: fixtures.vendorB.handle,
          domain: "store-b.example.test",
          locale: "ar-LY",
          contact: {
            public_email: fixtures.storeProfileB.public_contact_email ?? null,
            public_phone: null,
            whatsapp_number: null,
          },
          branding: {
            logo_url: null,
            primary_color: null,
            secondary_color: null,
            typography_key: "cairo",
          },
          storefront: null,
        });
        expectSafePublicPayload(profileA.data, fixtures);
        expectSafePublicPayload(profileB.data, fixtures);

        expect(
          (await resolve("store-a.example.test", fixtures.apiKeyB.token))
            .status,
        ).toBe(404);
        expect(
          (await resolve("store-b.example.test", fixtures.apiKeyA.token))
            .status,
        ).toBe(404);
      });

      it("returns only canonical published products for each Store", async () => {
        const productA = await createProduct(
          "a",
          "Phase 3 Published Product A",
          "phase-3-published-product-a",
          "published",
        );
        const productB = await createProduct(
          "b",
          "Phase 3 Published Product B",
          "phase-3-published-product-b",
          "published",
        );
        const draftA = await createProduct(
          "a",
          "Phase 3 Draft Product A",
          "phase-3-draft-product-a",
          "draft",
        );
        const productFields = encodeURIComponent(
          "+metadata,+variants.metadata",
        );
        const presentationFields = encodeURIComponent(
          "handle,title,subtitle,description,thumbnail,images.url",
        );
        const listA = await api.get(`/store/products?fields=${productFields}`, {
          headers: headersFor("a"),
        });
        const listB = await api.get(`/store/products?fields=${productFields}`, {
          headers: headersFor("b"),
        });
        const idsA = listA.data.products.map((product: any) => product.id);
        const idsB = listB.data.products.map((product: any) => product.id);

        expect(Object.keys(listA.data).sort()).toEqual([
          "count",
          "limit",
          "offset",
          "products",
        ]);
        expect(listA.data).toEqual(
          expect.objectContaining({
            count: expect.any(Number),
            limit: expect.any(Number),
            offset: expect.any(Number),
            products: expect.any(Array),
          }),
        );
        expect(idsA).toContain(productA.id);
        expect(idsA).not.toContain(productB.id);
        expect(idsA).not.toContain(draftA.id);
        expect(idsB).toContain(productB.id);
        expect(idsB).not.toContain(productA.id);

        const presentationListA = await api.get(
          `/store/products?fields=${presentationFields}&limit=12&offset=0`,
          { headers: headersFor("a") },
        );
        const presentationProductA = presentationListA.data.products.find(
          (product: any) => product.handle === productA.handle,
        );

        expect(presentationListA.data).toEqual(
          expect.objectContaining({
            count: expect.any(Number),
            limit: 12,
            offset: 0,
            products: expect.any(Array),
          }),
        );
        expect(presentationProductA).toEqual(
          expect.objectContaining({
            handle: productA.handle,
            title: productA.title,
            images: expect.any(Array),
          }),
        );
        expect(presentationProductA).not.toHaveProperty("metadata");
        expect(presentationProductA).not.toHaveProperty("variants");

        const ownDetail = await api.get(
          `/store/products/${productA.id}?fields=${productFields}`,
          { headers: headersFor("a") },
        );
        expect(ownDetail.data.product.id).toBe(productA.id);
        expect(Object.keys(ownDetail.data)).toEqual(["product"]);

        const crossDetail = await api.get(`/store/products/${productB.id}`, {
          headers: headersFor("a"),
          validateStatus: () => true,
        });
        expect(crossDetail.status).toBe(404);

        expectSafePublicPayload(listA.data, fixtures);
        expectSafePublicPayload(listB.data, fixtures);
        expectSafePublicPayload(ownDetail.data, fixtures);
      });

      it("fails closed for inactive Stores and unverified hostnames", async () => {
        const saas = getContainer().resolve("saas") as any;

        await saas.updateStoreProfiles({
          id: fixtures.storeProfileB.id,
          status: "suspended",
        });
        const inactive = await api.get("/store/vendors/resolve", {
          headers: headersFor("b"),
          validateStatus: () => true,
        });
        expect(inactive.status).toBe(404);

        const domains = await saas.listStoreDomains({
          store_profile_id: fixtures.storeProfileA.id,
        });
        await saas.updateStoreDomains({
          id: domains[0].id,
          verification_status: "pending",
        });
        const unverified = await api.get("/store/vendors/resolve", {
          headers: headersFor("a"),
          validateStatus: () => true,
        });
        expect(unverified.status).toBe(404);
      });
    });
  },
});

jest.setTimeout(240_000);
