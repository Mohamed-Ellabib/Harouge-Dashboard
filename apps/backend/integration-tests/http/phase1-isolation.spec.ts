import {
  createOrderWorkflow,
  createRegionsWorkflow,
} from "@medusajs/core-flows";
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import {
  createVendorSessionToken,
  VENDOR_SESSION_COOKIE,
} from "../../src/api/_utils/vendor-auth";
import { vendorLoginRateLimiter } from "../../src/api/_utils/vendor-login-rate-limit";
import { assignDirectOrderOwnership } from "../../src/api/_utils/cart-store-context";
import { vendorProductLinkDefinition } from "../../src/api/_utils/vendors";
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
    describe("Phase 1 authoritative store isolation", () => {
      let fixtures: SecurityFixtures;

      beforeEach(async () => {
        vendorLoginRateLimiter.reset();
        fixtures = await createSecurityFixtures(getContainer());
      });

      const login = async (email: string, password: string) =>
        cookieFrom(await api.post("/vendor/auth/login", { email, password }));

      const loginA = () => login(fixtures.memberA.email, fixtures.passwordA);
      const loginB = () => login(fixtures.memberB.email, fixtures.passwordB);

      const createProduct = async (
        cookie: string,
        title: string,
        handle: string,
        price = 1500,
      ) =>
        (
          await api.post(
            "/vendor/products",
            { title, handle, status: "published", price, currency_code: "lyd" },
            { headers: { Cookie: cookie } },
          )
        ).data.product;

      it("rejects missing sessions and missing membership relationships", async () => {
        const missing = await api.get("/vendor/me", {
          validateStatus: () => true,
        });
        expect(missing.status).toBe(401);

        const token = createVendorSessionToken({
          member_id: "vmem_missing",
          vendor_id: fixtures.vendorA.id,
          store_profile_id: fixtures.storeProfileA.id,
          session_version: 0,
        }).token;
        const unknownMembership = await api.get("/vendor/me", {
          headers: { Cookie: `${VENDOR_SESSION_COOKIE}=${token}` },
          validateStatus: () => true,
        });
        expect(unknownMembership.status).toBe(403);
      });

      it("fails login closed when the permanent Store has no sales channel", async () => {
        const storeService = getContainer().resolve("store") as any;
        await storeService.updateStores(fixtures.medusaStoreA.id, {
          default_sales_channel_id: null,
        });
        const response = await api.post(
          "/vendor/auth/login",
          { email: fixtures.memberA.email, password: fixtures.passwordA },
          { validateStatus: () => true },
        );
        expect(response.status).toBe(401);
        expect(response.data).toEqual({
          message: "Invalid vendor credentials.",
        });
      });
      it("rejects inactive stores and ambiguous active login memberships", async () => {
        const saas = getContainer().resolve("saas") as any;
        await saas.updateStoreProfiles({
          id: fixtures.storeProfileA.id,
          status: "suspended",
        });
        const inactive = await api.post(
          "/vendor/auth/login",
          { email: fixtures.memberA.email, password: fixtures.passwordA },
          { validateStatus: () => true },
        );
        expect(inactive.status).toBe(401);

        await saas.updateStoreProfiles({
          id: fixtures.storeProfileA.id,
          status: "active",
        });
        await fixtures.marketplace.createVendorMembers({
          vendor_id: fixtures.vendorB.id,
          email: fixtures.memberA.email,
          role: "manager",
          status: "active",
          metadata: fixtures.memberA.metadata,
        } as any);
        vendorLoginRateLimiter.reset();
        const ambiguous = await api.post(
          "/vendor/auth/login",
          { email: fixtures.memberA.email, password: fixtures.passwordA },
          { validateStatus: () => true },
        );
        expect(ambiguous.status).toBe(401);
        expect(ambiguous.data).toEqual({
          message: "Invalid vendor credentials.",
        });
      });

      it("isolates every implemented product operation and ambiguous ownership", async () => {
        const cookieA = await loginA();
        const cookieB = await loginB();
        const productA = await createProduct(
          cookieA,
          "Phase 1 Product A",
          "phase-1-product-a",
        );
        const productB = await createProduct(
          cookieB,
          "Phase 1 Product B",
          "phase-1-product-b",
          2200,
        );

        const listA = await api.get("/vendor/products", {
          headers: { Cookie: cookieA },
        });
        const listB = await api.get("/vendor/products", {
          headers: { Cookie: cookieB },
        });
        expect(listA.data.products.map((product: any) => product.id)).toEqual([
          productA.id,
        ]);
        expect(listB.data.products.map((product: any) => product.id)).toEqual([
          productB.id,
        ]);

        expect(
          (
            await api.get(`/vendor/products/${productA.id}`, {
              headers: { Cookie: cookieA },
            })
          ).data.product.id,
        ).toBe(productA.id);

        for (const status of [undefined, "published", "draft"]) {
          const response = status
            ? await api.patch(
                `/vendor/products/${productA.id}`,
                { status },
                { headers: { Cookie: cookieB }, validateStatus: () => true },
              )
            : await api.get(`/vendor/products/${productA.id}`, {
                headers: { Cookie: cookieB },
                validateStatus: () => true,
              });
          expect(response.status).toBe(404);
        }

        const hostile = await api.patch(
          `/vendor/products/${productA.id}`,
          {
            vendor_id: fixtures.vendorB.id,
            store_id: fixtures.vendorB.id,
            sales_channel_ids: [fixtures.salesChannelB.id],
          },
          { headers: { Cookie: cookieA }, validateStatus: () => true },
        );
        expect(hostile.status).toBe(400);

        await api.patch(
          `/vendor/products/${productA.id}`,
          { status: "draft" },
          { headers: { Cookie: cookieA } },
        );
        await api.patch(
          `/vendor/products/${productA.id}`,
          { status: "published" },
          { headers: { Cookie: cookieA } },
        );

        const link = getContainer().resolve(
          ContainerRegistrationKeys.LINK,
        ) as any;
        await expect(
          link.create([
            vendorProductLinkDefinition(fixtures.vendorB.id, productA.id),
          ]),
        ).rejects.toThrow(/Cannot create multiple links/);
        const ambiguousList = await api.get("/vendor/products", {
          headers: { Cookie: cookieA },
        });
        expect(
          ambiguousList.data.products.map((product: any) => product.id),
        ).toContain(productA.id);
        const ambiguousDetail = await api.get(
          `/vendor/products/${productA.id}`,
          {
            headers: { Cookie: cookieA },
            validateStatus: () => true,
          },
        );
        expect(ambiguousDetail.status).toBe(200);

        const unsupportedDelete = await api.delete(
          `/vendor/products/${productB.id}`,
          {
            headers: { Cookie: cookieA },
            validateStatus: () => true,
          },
        );
        expect(unsupportedDelete.status).toBe(404);
      });

      it("protects shop fields and centralizes owner versus manager permissions", async () => {
        const cookieA = await loginA();
        const updated = await api.patch(
          "/vendor/me",
          {
            name: "Updated Store A",
            contact_email: "public-a@example.test",
            primary_color: "#123456",
          },
          { headers: { Cookie: cookieA } },
        );
        expect(updated.data.vendor.name).toBe("Updated Store A");
        expect(updated.data.vendor.contact_email).toBe("public-a@example.test");

        for (const field of [
          { vendor_id: fixtures.vendorB.id },
          { status: "suspended" },
          { handle: fixtures.vendorB.handle },
          { domains: ["store-b.example.test"] },
          { sales_channel_id: fixtures.salesChannelB.id },
          { plan: "enterprise" },
        ]) {
          const rejected = await api.patch("/vendor/me", field, {
            headers: { Cookie: cookieA },
            validateStatus: () => true,
          });
          expect(rejected.status).toBe(400);
        }

        expect(
          (await fixtures.marketplace.retrieveVendor(fixtures.vendorB.id)).name,
        ).toBe(fixtures.vendorB.name);

        const saas = getContainer().resolve("saas") as any;
        await saas.updateMerchantMemberships({
          id: fixtures.membershipA.id,
          role: "manager",
        });
        const managerRead = await api.get("/vendor/me", {
          headers: { Cookie: cookieA },
        });
        expect(managerRead.status).toBe(200);
        const managerUpdate = await api.patch(
          "/vendor/me",
          { name: "Manager must not change this" },
          { headers: { Cookie: cookieA }, validateStatus: () => true },
        );
        expect(managerUpdate.status).toBe(403);
      });

      it("enforces the complete public hostname and key matrix", async () => {
        const resolve = (host: string, key: string, extraHeaders = {}) =>
          api.get("/store/vendors/resolve?domain=store-b.example.test", {
            headers: {
              Host: host,
              "x-publishable-api-key": key,
              ...extraHeaders,
            },
            validateStatus: () => true,
          });

        const storeA = await resolve(
          "store-a.example.test",
          fixtures.apiKeyA.token,
        );
        const storeB = await resolve(
          "store-b.example.test",
          fixtures.apiKeyB.token,
        );
        expect(storeA.status).toBe(200);
        expect(storeA.data.vendor.handle).toBe(fixtures.vendorA.handle);
        expect(storeB.status).toBe(200);
        expect(storeB.data.vendor.handle).toBe(fixtures.vendorB.handle);

        expect(
          (await resolve("store-a.example.test", fixtures.apiKeyB.token))
            .status,
        ).toBe(404);
        expect(
          (await resolve("store-b.example.test", fixtures.apiKeyA.token))
            .status,
        ).toBe(404);
        expect(
          (await resolve("unknown.example.test", fixtures.apiKeyA.token))
            .status,
        ).toBe(404);

        const normalized = await resolve(
          "STORE-A.EXAMPLE.TEST.:443",
          fixtures.apiKeyA.token,
        );
        expect(normalized.status).toBe(200);
        expect(normalized.data.vendor.handle).toBe(fixtures.vendorA.handle);

        const forwarded = await resolve(
          "store-a.example.test",
          fixtures.apiKeyA.token,
          {
            "X-Forwarded-Host": "store-b.example.test",
          },
        );
        expect(forwarded.status).toBe(200);
        expect(forwarded.data.vendor.handle).toBe(fixtures.vendorA.handle);

        expect(Object.keys(storeA.data.vendor).sort()).toEqual([
          "branding",
          "domain",
          "handle",
          "name",
        ]);

        const saas = getContainer().resolve("saas") as any;
        await saas.updateStoreProfiles({
          id: fixtures.storeProfileB.id,
          status: "suspended",
        });
        expect(
          (await resolve("store-b.example.test", fixtures.apiKeyB.token))
            .status,
        ).toBe(404);
      });

      it("binds public product lists and direct reads to the verified store", async () => {
        const cookieA = await loginA();
        const cookieB = await loginB();
        const productA = await createProduct(
          cookieA,
          "Public Product A",
          "public-product-a",
        );
        const productB = await createProduct(
          cookieB,
          "Public Product B",
          "public-product-b",
        );
        const headersA = {
          Host: "store-a.example.test",
          "x-publishable-api-key": fixtures.apiKeyA.token,
        };
        const products = await api.get("/store/products", {
          headers: headersA,
        });
        const ids = products.data.products.map((product: any) => product.id);
        expect(ids).toContain(productA.id);
        expect(ids).not.toContain(productB.id);

        const crossRead = await api.get(`/store/products/${productB.id}`, {
          headers: headersA,
          validateStatus: () => true,
        });
        expect(crossRead.status).toBe(404);
      });

      it("authorizes whole Orders and rejects mixed-store order creation", async () => {
        const cookieA = await loginA();
        const cookieB = await loginB();
        const productA = await createProduct(
          cookieA,
          "Order Product A",
          "order-product-a",
        );
        const productB = await createProduct(
          cookieB,
          "Order Product B",
          "order-product-b",
        );
        const { result: regions } = await createRegionsWorkflow(
          getContainer(),
        ).run({
          input: {
            regions: [
              {
                name: "Phase 1 Test Region",
                currency_code: "eur",
                countries: ["de"],
              },
            ],
          },
        });
        const region = regions[0];
        const orderInput = (
          salesChannelId: string,
          product: Record<string, any>,
          email: string,
        ) => ({
          region_id: region.id,
          email,
          currency_code: "eur",
          sales_channel_id: salesChannelId,
          status: "pending",
          items: [
            {
              variant_id: product.variants[0].id,
              title: product.title,
              quantity: 1,
              unit_price: 1500,
            },
          ],
        });

        let mixedOrder: Record<string, any> | null = null;
        try {
          const created = await createOrderWorkflow(getContainer()).run({
            input: {
              ...orderInput(
                fixtures.salesChannelA.id,
                productA,
                "mixed-order@example.test",
              ),
              items: [
                ...orderInput(
                  fixtures.salesChannelA.id,
                  productA,
                  "mixed-order@example.test",
                ).items,
                {
                  variant_id: productB.variants[0].id,
                  title: productB.title,
                  quantity: 1,
                  unit_price: 2200,
                },
              ],
            } as any,
          });
          mixedOrder = created.result;
        } catch (error) {
          expect(String((error as Error).message)).toMatch(
            /not available for this Store/i,
          );
        }

        if (mixedOrder) {
          await expect(
            assignDirectOrderOwnership(getContainer(), mixedOrder),
          ).rejects.toThrow(/not available for this Store/i);
        }

        const { result: storeAOrder } = await createOrderWorkflow(
          getContainer(),
        ).run({
          input: orderInput(
            fixtures.salesChannelA.id,
            productA,
            "store-a-customer@example.test",
          ) as any,
        });
        await assignDirectOrderOwnership(getContainer(), storeAOrder);
        const { result: storeBOrder } = await createOrderWorkflow(
          getContainer(),
        ).run({
          input: orderInput(
            fixtures.salesChannelB.id,
            productB,
            "store-b-customer@example.test",
          ) as any,
        });

        await assignDirectOrderOwnership(getContainer(), storeBOrder);
        const listA = await api.get("/vendor/orders", {
          headers: { Cookie: cookieA },
        });
        const rowA = listA.data.orders.find(
          (order: any) => order.id === storeAOrder.id,
        );
        expect(rowA.items.map((item: any) => item.product_id)).toEqual([
          productA.id,
        ]);
        expect(Object.keys(rowA).sort()).toEqual([
          "created_at",
          "currency_code",
          "display_id",
          "email",
          "id",
          "items",
          "status",
          "updated_at",
          "vendor_total",
        ]);
        for (const key of [
          "shipping_address",
          "billing_address",
          "phone",
          "customer",
          "metadata",
          "payment_collections",
          "fulfillments",
          "internal_note",
        ]) {
          expect(rowA).not.toHaveProperty(key);
        }

        const detailA = await api.get(`/vendor/orders/${storeAOrder.id}`, {
          headers: { Cookie: cookieA },
        });
        expect(detailA.data.order).toEqual(rowA);
        const crossOrder = await api.get(`/vendor/orders/${storeBOrder.id}`, {
          headers: { Cookie: cookieA },
          validateStatus: () => true,
        });
        expect(crossOrder.status).toBe(404);
      });
    });
  },
});

jest.setTimeout(360_000);
