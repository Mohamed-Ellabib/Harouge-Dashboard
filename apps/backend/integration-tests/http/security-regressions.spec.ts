import { createSalesChannelsWorkflow } from "@medusajs/core-flows";
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { vendorLoginRateLimiter } from "../../src/api/_utils/vendor-login-rate-limit";
import { PATCH as adminUpdateMember } from "../../src/api/admin/vendors/[id]/members/[member_id]/route";
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
  AUTH_CORS: "http://127.0.0.1:5173",
};

const cookieFrom = (response: any): string => {
  const setCookie = response.headers["set-cookie"]?.[0];

  if (!setCookie) {
    throw new Error("Vendor login did not return a session cookie.");
  }

  return setCookie.split(";")[0];
};

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: testEnv,
  testSuite: ({ api, getContainer }) => {
    describe("Phase 0.5 security regressions", () => {
      let fixtures: SecurityFixtures;

      beforeEach(async () => {
        vendorLoginRateLimiter.reset();
        fixtures = await createSecurityFixtures(getContainer());
      });

      const login = async (email: string, password: string) => {
        const response = await api.post("/vendor/auth/login", {
          email,
          password,
        });
        return cookieFrom(response);
      };

      it("keeps products within the authenticated vendor sales channel", async () => {
        const cookieA = await login(
          "merchant-a@example.test",
          fixtures.passwordA,
        );
        const cookieB = await login(
          "merchant-b@example.test",
          fixtures.passwordB,
        );
        const createdA = await api.post(
          "/vendor/products",
          {
            title: "Product A",
            handle: "phase-05-product-a",
            status: "published",
            price: 1250,
            currency_code: "lyd",
            vendor_id: fixtures.vendorB.id,
            sales_channel_ids: [fixtures.salesChannelB.id],
            sales_channels: [fixtures.salesChannelA, fixtures.salesChannelB],
          },
          { headers: { Cookie: cookieA } },
        );
        const productA = createdA.data.product;

        const createdB = await api.post(
          "/vendor/products",
          {
            title: "Product B",
            handle: "phase-05-product-b",
            status: "published",
            price: 2200,
            currency_code: "lyd",
          },
          { headers: { Cookie: cookieB } },
        );
        expect(createdB.status).toBe(201);

        const query = getContainer().resolve(
          ContainerRegistrationKeys.QUERY,
        ) as any;
        const readProductA = async () => {
          const { data } = await query.graph({
            entity: "product",
            fields: ["id", "sales_channels.id"],
            filters: { id: productA.id },
          });
          return data[0];
        };
        const beforeNewChannel = await readProductA();

        expect(
          beforeNewChannel.sales_channels.map((channel) => channel.id),
        ).toEqual([fixtures.salesChannelA.id]);

        await createSalesChannelsWorkflow(getContainer()).run({
          input: {
            salesChannelsData: [{ name: "Phase 0.5 Sales Channel C" }],
          },
        });
        const afterNewChannel = await readProductA();
        expect(
          afterNewChannel.sales_channels.map((channel) => channel.id),
        ).toEqual([fixtures.salesChannelA.id]);

        const storeAProducts = await api.get("/store/products", {
          headers: {
            Host: "store-a.example.test",
            "x-publishable-api-key": fixtures.apiKeyA.token,
          },
        });
        const storeBProducts = await api.get("/store/products", {
          headers: {
            Host: "store-b.example.test",
            "x-publishable-api-key": fixtures.apiKeyB.token,
          },
        });
        expect(
          storeAProducts.data.products.map((product) => product.id),
        ).toContain(productA.id);
        expect(
          storeBProducts.data.products.map((product) => product.id),
        ).not.toContain(productA.id);

        const crossVendorUpdate = await api.patch(
          `/vendor/products/${productA.id}`,
          {
            title: "Merchant B must not change this",
            sales_channel_ids: [fixtures.salesChannelB.id],
          },
          {
            headers: { Cookie: cookieB },
            validateStatus: () => true,
          },
        );
        expect(crossVendorUpdate.status).toBeGreaterThanOrEqual(400);
        expect(crossVendorUpdate.status).toBeLessThan(500);
      });

      it("revokes every prior session after password changes, resets, and disabling", async () => {
        const sessionA = await login(
          "merchant-a@example.test",
          fixtures.passwordA,
        );
        const sessionB = await login(
          "merchant-a@example.test",
          fixtures.passwordA,
        );

        for (const cookie of [sessionA, sessionB]) {
          expect(
            (await api.get("/vendor/me", { headers: { Cookie: cookie } }))
              .status,
          ).toBe(200);
        }

        const changedPassword = "Merchant-A-Changed-Passphrase";
        const change = await api.patch(
          "/vendor/auth/password",
          {
            current_password: fixtures.passwordA,
            new_password: changedPassword,
          },
          { headers: { Cookie: sessionA } },
        );
        expect(change.data.reauthentication_required).toBe(true);

        for (const cookie of [sessionA, sessionB]) {
          const rejected = await api.get("/vendor/me", {
            headers: { Cookie: cookie },
            validateStatus: () => true,
          });
          expect(rejected.status).toBe(403);
        }

        vendorLoginRateLimiter.reset();
        const oldPassword = await api.post(
          "/vendor/auth/login",
          {
            email: "merchant-a@example.test",
            password: fixtures.passwordA,
          },
          { validateStatus: () => true },
        );
        expect(oldPassword.status).toBe(401);
        const resetSessionA = await login(
          "merchant-a@example.test",
          changedPassword,
        );
        const resetSessionB = await login(
          "merchant-a@example.test",
          changedPassword,
        );

        const adminResponse: any = {
          statusCode: 200,
          status(code: number) {
            this.statusCode = code;
            return this;
          },
          json(payload: unknown) {
            this.payload = payload;
            return this;
          },
        };
        const adminPassword = "Merchant-A-Admin-Reset-Passphrase";
        await adminUpdateMember(
          {
            scope: getContainer(),
            params: {
              id: fixtures.vendorA.id,
              member_id: fixtures.memberA.id,
            },
            body: { member_password: adminPassword },
          } as any,
          adminResponse,
        );
        expect(adminResponse.statusCode).toBe(200);

        for (const cookie of [resetSessionA, resetSessionB]) {
          const rejected = await api.get("/vendor/me", {
            headers: { Cookie: cookie },
            validateStatus: () => true,
          });
          expect(rejected.status).toBe(403);
        }

        vendorLoginRateLimiter.reset();
        const activeSession = await login(
          "merchant-a@example.test",
          adminPassword,
        );
        await adminUpdateMember(
          {
            scope: getContainer(),
            params: {
              id: fixtures.vendorA.id,
              member_id: fixtures.memberA.id,
            },
            body: { status: "disabled" },
          } as any,
          adminResponse,
        );
        const disabledSession = await api.get("/vendor/me", {
          headers: { Cookie: activeSession },
          validateStatus: () => true,
        });
        expect(disabledSession.status).toBe(403);
      });

      it("returns an exact allowlisted public store profile", async () => {
        const response = await api.get(
          `/store/vendors/${fixtures.vendorA.handle}`,
          {
            headers: { "x-publishable-api-key": fixtures.apiKeyA.token },
          },
        );
        const profile = response.data.vendor;

        expect(Object.keys(profile).sort()).toEqual([
          "branding",
          "domain",
          "handle",
          "name",
        ]);
        expect(Object.keys(profile.branding).sort()).toEqual([
          "logo_url",
          "primary_color",
        ]);
        for (const key of [
          "id",
          "contact_email",
          "metadata",
          "status",
          "created_at",
          "updated_at",
          "members",
          "domains",
          "password_hash",
          "session_version",
        ]) {
          expect(profile).not.toHaveProperty(key);
        }
      });

      it("bounds malformed and repeated login attempts without account enumeration", async () => {
        const malformed = await api.post(
          "/vendor/auth/login",
          { email: "not-an-email", password: 42 },
          { validateStatus: () => true },
        );
        const unknown = await api.post(
          "/vendor/auth/login",
          {
            email: "unknown@example.test",
            password: "A-valid-looking-passphrase",
          },
          { validateStatus: () => true },
        );
        const excessive = await api.post(
          "/vendor/auth/login",
          {
            email: "merchant-a@example.test",
            password: "x".repeat(1025),
          },
          { validateStatus: () => true },
        );

        expect(malformed.status).toBe(401);
        expect(unknown.status).toBe(401);
        expect(excessive.status).toBe(401);
        expect(malformed.data).toEqual(unknown.data);
        expect(unknown.data).toEqual(excessive.data);

        vendorLoginRateLimiter.reset();
        let response: any;
        for (let attempt = 0; attempt < 6; attempt += 1) {
          response = await api.post(
            "/vendor/auth/login",
            {
              email: `failed-${attempt}@example.test`,
              password: "A-valid-looking-passphrase",
            },
            { validateStatus: () => true },
          );
        }
        expect(response.status).toBe(429);
        expect(response.headers["retry-after"]).toBeDefined();
      });
    });
  },
});

jest.setTimeout(180_000);
