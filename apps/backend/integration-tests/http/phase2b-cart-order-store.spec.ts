import {
  addToCartWorkflow,
  createOrderWorkflow,
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/core-flows";
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import {
  getOrderIdForCart,
  resolveCartStoreContext,
  validateCartForCompletion,
} from "../../src/api/_utils/cart-store-context";
import {
  linkCartToStore,
  listStoreCartLinks,
  listStoreOrderLinks,
  storeCartLinkDefinition,
  storeOrderLinkDefinition,
} from "../../src/api/_utils/checkout-ownership-links";
import { listStoreProductLinks } from "../../src/api/_utils/legacy-vendor-compatibility";
import { runCheckoutOwnershipBackfill } from "../../src/modules/saas/checkout-ownership-backfill";
import {
  createCheckoutFixtures,
  type CheckoutFixtures,
} from "../helpers/checkout-fixtures";

const testEnv = {
  NODE_ENV: "test",
  JWT_SECRET: "test-only-jwt-secret-not-for-production",
  COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
  VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
  STORE_CORS: "http://127.0.0.1:8000",
  ADMIN_CORS: "http://127.0.0.1:9000",
  AUTH_CORS: "http://127.0.0.1:5175",
};

const statusResponse = { validateStatus: () => true };

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: testEnv,
  testSuite: ({ api, getContainer }) => {
    describe("Phase 2B Cart and Order Store ownership", () => {
      let fixtures: CheckoutFixtures;

      beforeEach(async () => {
        fixtures = await createCheckoutFixtures(getContainer(), api);
      });

      const headersA = () => ({
        Host: "store-a.example.test",
        "x-publishable-api-key": fixtures.apiKeyA.token,
      });
      const headersB = () => ({
        Host: "store-b.example.test",
        "x-publishable-api-key": fixtures.apiKeyB.token,
      });
      const createCartA = async () =>
        (
          await api.post(
            "/store/carts",
            { region_id: fixtures.regionA.id },
            { headers: headersA() },
          )
        ).data.cart;
      const createCartB = async () =>
        (
          await api.post(
            "/store/carts",
            { region_id: fixtures.regionB.id },
            { headers: headersB() },
          )
        ).data.cart;
      const addItem = async (
        cartId: string,
        variantId: string,
        headers = headersA(),
      ) =>
        await api.post(
          `/store/carts/${cartId}/line-items`,
          { variant_id: variantId, quantity: 1 },
          { headers, validateStatus: () => true },
        );
      const prepareCheckout = async (cartId: string) => {
        expect((await addItem(cartId, fixtures.variantA.id)).status).toBe(200);
        const update = await api.post(
          `/store/carts/${cartId}`,
          {
            email: "checkout-a@example.test",
            shipping_address: {
              first_name: "Store",
              last_name: "Customer",
              address_1: "Test address",
              city: "Tripoli",
              country_code: "ly",
            },
          },
          { headers: headersA() },
        );
        expect(update.status).toBe(200);
        const shipping = await api.post(
          `/store/carts/${cartId}/shipping-methods`,
          { option_id: fixtures.shippingOptionA.id },
          { headers: headersA() },
        );
        expect(shipping.status).toBe(200);
        const collection = await api.post(
          "/store/payment-collections",
          { cart_id: cartId },
          { headers: headersA() },
        );
        const collectionId = collection.data.payment_collection.id;
        const session = await api.post(
          `/store/payment-collections/${collectionId}/payment-sessions`,
          { provider_id: "pp_system_default" },
          { headers: headersA() },
        );
        expect(session.status).toBe(200);
      };
      const complete = async (cartId: string) =>
        await api.post(
          `/store/saas/carts/${cartId}/complete`,
          { payment_method: "cod" },
          { headers: headersA(), validateStatus: () => true },
        );

      it("creates server-owned carts and rejects hostile context", async () => {
        const cartA = await createCartA();
        const cartB = await createCartB();
        const [linksA, linksB] = await Promise.all([
          listStoreCartLinks(getContainer(), { cart_id: cartA.id }),
          listStoreCartLinks(getContainer(), { cart_id: cartB.id }),
        ]);

        expect(cartA.sales_channel_id).toBe(fixtures.salesChannelA.id);
        expect(cartA.metadata.saas_publishable_api_key_id).toBe(
          fixtures.apiKeyA.id,
        );
        expect(cartB.sales_channel_id).toBe(fixtures.salesChannelB.id);
        expect(linksA).toEqual([
          expect.objectContaining({
            store_id: fixtures.medusaStoreA.id,
            cart_id: cartA.id,
          }),
        ]);
        expect(linksB).toEqual([
          expect.objectContaining({
            store_id: fixtures.medusaStoreB.id,
            cart_id: cartB.id,
          }),
        ]);

        const wrongKey = await api.post(
          "/store/carts",
          { region_id: fixtures.regionA.id },
          {
            headers: {
              Host: "store-a.example.test",
              "x-publishable-api-key": fixtures.apiKeyB.token,
            },
            ...statusResponse,
          },
        );
        const hostileStore = await api.post(
          "/store/carts",
          {
            region_id: fixtures.regionA.id,
            store_id: fixtures.medusaStoreB.id,
          },
          { headers: headersA(), ...statusResponse },
        );
        const hostileChannel = await api.post(
          "/store/carts",
          {
            region_id: fixtures.regionA.id,
            sales_channel_id: fixtures.salesChannelB.id,
          },
          { headers: headersA(), ...statusResponse },
        );
        const noContext = await api.post(
          "/store/carts",
          { region_id: fixtures.regionA.id },
          {
            headers: {
              "x-publishable-api-key": fixtures.apiKeyA.token,
            },
            ...statusResponse,
          },
        );

        expect(wrongKey.status).toBe(404);
        expect(hostileStore.status).toBeGreaterThanOrEqual(400);
        expect(hostileChannel.status).toBeGreaterThanOrEqual(400);
        expect(noContext.status).toBe(404);

        const link = getContainer().resolve(
          ContainerRegistrationKeys.LINK,
        ) as any;
        await expect(
          link.create(
            storeCartLinkDefinition(fixtures.medusaStoreB.id, cartA.id),
          ),
        ).rejects.toThrow(/multiple links/i);
      });

      it("binds retrieval and mutation to domain and publishable key", async () => {
        const cart = await createCartA();
        const own = await api.get(`/store/carts/${cart.id}`, {
          headers: headersA(),
        });
        const crossDomain = await api.get(`/store/carts/${cart.id}`, {
          headers: headersB(),
          ...statusResponse,
        });
        const crossKey = await api.get(`/store/carts/${cart.id}`, {
          headers: {
            Host: "store-a.example.test",
            "x-publishable-api-key": fixtures.apiKeyB.token,
          },
          ...statusResponse,
        });
        const { result: alternateKeys } = await createApiKeysWorkflow(
          getContainer(),
        ).run({
          input: {
            api_keys: [
              {
                title: "Phase 2B alternate Store A key",
                type: "publishable",
                created_by: "",
              },
            ],
          },
        });
        await linkSalesChannelsToApiKeyWorkflow(getContainer()).run({
          input: {
            id: alternateKeys[0].id,
            add: [fixtures.salesChannelA.id],
          },
        });
        const sameStoreDifferentKey = await api.get(`/store/carts/${cart.id}`, {
          headers: {
            Host: "store-a.example.test",
            "x-publishable-api-key": alternateKeys[0].token,
          },
          ...statusResponse,
        });

        const crossMutation = await api.post(
          `/store/carts/${cart.id}`,
          { email: "hostile@example.test" },
          { headers: headersB(), ...statusResponse },
        );

        expect(own.status).toBe(200);
        expect(crossDomain.status).toBe(404);
        expect(crossKey.status).toBe(404);
        expect(sameStoreDifferentKey.status).toBe(404);
        expect(crossMutation.status).toBe(404);
      });

      it("protects region, channel, shipping, and suspended stores", async () => {
        const cart = await createCartA();
        const wrongRegion = await api.post(
          `/store/carts/${cart.id}`,
          { region_id: fixtures.regionB.id },
          { headers: headersA(), ...statusResponse },
        );
        const wrongChannel = await api.post(
          `/store/carts/${cart.id}`,
          { sales_channel_id: fixtures.salesChannelB.id },
          { headers: headersA(), ...statusResponse },
        );
        const wrongShipping = await api.post(
          `/store/carts/${cart.id}/shipping-methods`,
          { option_id: fixtures.shippingOptionB.id },
          { headers: headersA(), ...statusResponse },
        );
        const correctRegion = await api.post(
          `/store/carts/${cart.id}`,
          { region_id: fixtures.regionA.id },
          { headers: headersA() },
        );

        expect(wrongRegion.status).toBeGreaterThanOrEqual(400);
        expect(wrongChannel.status).toBeGreaterThanOrEqual(400);
        expect(wrongShipping.status).toBeGreaterThanOrEqual(400);
        expect(correctRegion.status).toBe(200);

        const saas = getContainer().resolve("saas") as any;
        await saas.updateStoreProfiles({
          id: fixtures.storeProfileA.id,
          status: "suspended",
        });
        const suspended = await api.post(
          `/store/carts/${cart.id}`,
          { email: "blocked@example.test" },
          { headers: headersA(), ...statusResponse },
        );
        expect(suspended.status).toBe(404);
      });

      it("prevents mixed-store items even after channel misconfiguration", async () => {
        const cart = await createCartA();
        const allowed = await addItem(cart.id, fixtures.variantA.id);
        expect(allowed.status).toBe(200);

        const blocked = await addItem(cart.id, fixtures.variantB.id);
        expect(blocked.status).toBeGreaterThanOrEqual(400);

        const link = getContainer().resolve(
          ContainerRegistrationKeys.LINK,
        ) as any;
        await link.create({
          [Modules.PRODUCT]: { product_id: fixtures.productB.id },
          [Modules.SALES_CHANNEL]: {
            sales_channel_id: fixtures.salesChannelA.id,
          },
        });
        const stillBlocked = await addItem(cart.id, fixtures.variantB.id);
        expect(stillBlocked.status).toBeGreaterThanOrEqual(400);

        const freshCart = await createCartA();
        await expect(
          addToCartWorkflow(getContainer()).run({
            input: {
              cart_id: freshCart.id,
              items: [
                { variant_id: fixtures.variantA.id, quantity: 1 },
                { variant_id: fixtures.variantB.id, quantity: 1 },
              ],
            },
          }),
        ).rejects.toBeDefined();
        const readFresh = await api.get(`/store/carts/${freshCart.id}`, {
          headers: headersA(),
        });
        expect(readFresh.data.cart.items).toHaveLength(0);

        const remove = await api.delete(
          `/store/carts/${cart.id}/line-items/${allowed.data.cart.items[0].id}`,
          { headers: headersA() },
        );
        expect(remove.status).toBe(200);
      });

      it("fails safely for archived products and concurrent hostile adds", async () => {
        const cart = await createCartA();
        const attempts = await Promise.all([
          addItem(cart.id, fixtures.variantB.id),
          addItem(cart.id, fixtures.variantB.id),
        ]);

        expect(attempts.every((response) => response.status >= 400)).toBe(true);
        const unchanged = await api.get(`/store/carts/${cart.id}`, {
          headers: headersA(),
        });
        expect(unchanged.data.cart.items).toHaveLength(0);

        await deleteProductsWorkflow(getContainer()).run({
          input: { ids: [fixtures.productA.id] },
        });
        const archived = await addItem(cart.id, fixtures.variantA.id);
        expect(archived.status).toBeGreaterThanOrEqual(400);

        await Promise.all([
          linkCartToStore(getContainer(), fixtures.medusaStoreA.id, cart.id),
          linkCartToStore(getContainer(), fixtures.medusaStoreA.id, cart.id),
        ]);
        expect(
          await listStoreCartLinks(getContainer(), { cart_id: cart.id }),
        ).toHaveLength(1);
      });

      it("fails closed for unowned, mismatched, and customer-bound carts", async () => {
        const cartService = getContainer().resolve(Modules.CART) as any;
        const unowned = await cartService.createCarts({
          currency_code: "lyd",
          region_id: fixtures.regionA.id,
          sales_channel_id: fixtures.salesChannelA.id,
        });

        await expect(
          resolveCartStoreContext(getContainer(), unowned.id),
        ).rejects.toThrow(/Cart was not found/i);
        await expect(
          validateCartForCompletion(getContainer(), unowned.id),
        ).rejects.toThrow(/Cart was not found/i);

        const mismatched = await createCartA();
        await cartService.updateCarts(mismatched.id, {
          sales_channel_id: fixtures.salesChannelB.id,
        });
        await expect(
          validateCartForCompletion(getContainer(), mismatched.id),
        ).rejects.toThrow(/sales channel and canonical Store disagree/i);

        const customerCart = await createCartA();
        await cartService.updateCarts(customerCart.id, {
          customer_id: fixtures.customerA.id,
        });
        const anonymousRead = await api.get(`/store/carts/${customerCart.id}`, {
          headers: headersA(),
          ...statusResponse,
        });
        expect(anonymousRead.status).toBe(404);
      });

      it("completes once and assigns immutable whole-order ownership", async () => {
        const cart = await createCartA();
        await prepareCheckout(cart.id);
        const first = await complete(cart.id);

        expect(first.status).toBe(200);
        expect(first.data.type).toBe("order");
        const orderId = await getOrderIdForCart(getContainer(), cart.id);
        expect(typeof orderId).toBe("string");
        if (!orderId) throw new Error("Order ownership was not created.");
        const orderLinks = await listStoreOrderLinks(getContainer(), {
          order_id: orderId,
        });
        expect(orderLinks).toEqual([
          expect.objectContaining({
            store_id: fixtures.medusaStoreA.id,
            order_id: orderId,
          }),
        ]);
        expect(await getOrderIdForCart(getContainer(), cart.id)).toBe(orderId);

        const retry = await complete(cart.id);
        expect(retry.status).toBe(200);
        expect(retry.data.order.display_id).toBe(first.data.order.display_id);
        expect(
          await listStoreOrderLinks(getContainer(), { order_id: orderId }),
        ).toHaveLength(1);

        const query = getContainer().resolve(
          ContainerRegistrationKeys.QUERY,
        ) as any;
        const { data: orders } = await query.graph({
          entity: "order",
          fields: [
            "id",
            "sales_channel_id",
            "items.product_id",
            "items.variant.product_id",
          ],
          filters: { id: orderId },
        });
        expect(orders[0].sales_channel_id).toBe(fixtures.salesChannelA.id);
        expect(
          orders[0].items.map(
            (item: any) => item.product_id ?? item.variant?.product_id,
          ),
        ).toEqual([fixtures.productA.id]);

        const link = getContainer().resolve(
          ContainerRegistrationKeys.LINK,
        ) as any;
        await expect(
          link.create(
            storeOrderLinkDefinition(fixtures.medusaStoreB.id, orderId),
          ),
        ).rejects.toThrow(/multiple links/i);
      });

      it("serializes simultaneous checkout to one commercial Order", async () => {
        const cart = await createCartA();
        await prepareCheckout(cart.id);
        const responses = await Promise.all([
          complete(cart.id),
          complete(cart.id),
        ]);
        const successes = responses.filter(
          (response) =>
            response.status === 200 && response.data.type === "order",
        );

        expect(successes.length).toBeGreaterThanOrEqual(1);
        expect(
          responses.every((response) => [200, 409].includes(response.status)),
        ).toBe(true);

        const query = getContainer().resolve(
          ContainerRegistrationKeys.QUERY,
        ) as any;
        const { data: relations } = await query.graph({
          entity: "order_cart",
          fields: ["order_id", "cart_id"],
          filters: { cart_id: cart.id },
        });
        expect(relations).toHaveLength(1);
        expect(
          await listStoreOrderLinks(getContainer(), {
            order_id: relations[0].order_id,
          }),
        ).toHaveLength(1);
      });

      it("does not return false checkout success when Order linking fails", async () => {
        const cart = await createCartA();
        await prepareCheckout(cart.id);
        process.env.SAAS_TEST_FAIL_ORDER_LINK_CART_ID = cart.id;

        try {
          const response = await complete(cart.id);
          expect(response.status).toBeGreaterThanOrEqual(400);

          const saas = getContainer().resolve("saas") as any;
          const repairs = await saas.listCheckoutOwnershipRepairs({
            cart_id: cart.id,
            status: "pending",
          });
          expect(repairs).toEqual([
            expect.objectContaining({
              kind: "order",
              reason: "order_store_link_failed",
              store_id: fixtures.medusaStoreA.id,
            }),
          ]);
        } finally {
          delete process.env.SAAS_TEST_FAIL_ORDER_LINK_CART_ID;
        }
      });

      it("authorizes merchants only through the whole-order Store link", async () => {
        const cart = await createCartA();
        await prepareCheckout(cart.id);
        const completed = await complete(cart.id);
        expect(completed.status).toBe(200);
        const orderId = await getOrderIdForCart(getContainer(), cart.id);
        expect(typeof orderId).toBe("string");
        if (!orderId) throw new Error("Order ownership was not created.");
        const listA = await api.get("/vendor/orders", {
          headers: { Cookie: fixtures.merchantCookieA },
        });
        const listB = await api.get("/vendor/orders", {
          headers: { Cookie: fixtures.merchantCookieB },
        });

        expect(listA.data.orders.map((order: any) => order.id)).toContain(
          orderId,
        );
        expect(listB.data.orders.map((order: any) => order.id)).not.toContain(
          orderId,
        );
        const crossDetail = await api.get(`/vendor/orders/${orderId}`, {
          headers: { Cookie: fixtures.merchantCookieB },
          ...statusResponse,
        });
        expect(crossDetail.status).toBe(404);
        expect(Object.keys(listA.data.orders[0]).sort()).toEqual([
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

        const link = getContainer().resolve(
          ContainerRegistrationKeys.LINK,
        ) as any;
        await link.dismiss(
          storeOrderLinkDefinition(fixtures.medusaStoreA.id, orderId),
        );
        const missingOwnership = await api.get(`/vendor/orders/${orderId}`, {
          headers: { Cookie: fixtures.merchantCookieA },
          ...statusResponse,
        });
        expect(missingOwnership.status).toBe(404);
      });

      it("backfills only unambiguous local Cart and Order ownership", async () => {
        const container = getContainer();
        const cartService = container.resolve(Modules.CART) as any;
        const cart = await cartService.createCarts({
          currency_code: "lyd",
          region_id: fixtures.regionA.id,
          sales_channel_id: fixtures.salesChannelA.id,
        });
        const { result: order } = await createOrderWorkflow(container).run({
          input: {
            region_id: fixtures.regionA.id,
            email: "backfill-order@example.test",
            currency_code: "lyd",
            sales_channel_id: fixtures.salesChannelA.id,
            status: "pending",
            items: [
              {
                variant_id: fixtures.variantA.id,
                title: fixtures.productA.title,
                quantity: 1,
                unit_price: 1500,
              },
            ],
          } as any,
        });
        const link = container.resolve(ContainerRegistrationKeys.LINK) as any;
        await link.dismiss(
          storeOrderLinkDefinition(fixtures.medusaStoreA.id, order.id),
        );

        const dryRun = await runCheckoutOwnershipBackfill(container);
        expect(dryRun.mode).toBe("dry-run");
        expect(dryRun.counts.carts_linked).toBe(1);
        expect(dryRun.counts.orders_linked).toBe(1);
        expect(
          await listStoreCartLinks(container, { cart_id: cart.id }),
        ).toHaveLength(0);
        expect(
          await listStoreOrderLinks(container, { order_id: order.id }),
        ).toHaveLength(0);

        const applied = await runCheckoutOwnershipBackfill(container, {
          apply: true,
        });
        expect(applied.counts.carts_linked).toBe(1);
        expect(applied.counts.orders_linked).toBe(1);
        expect(
          await listStoreCartLinks(container, { cart_id: cart.id }),
        ).toHaveLength(1);
        expect(
          await listStoreOrderLinks(container, { order_id: order.id }),
        ).toHaveLength(1);

        const rerun = await runCheckoutOwnershipBackfill(container, {
          apply: true,
        });
        expect(rerun.counts.carts_linked).toBe(0);
        expect(rerun.counts.orders_linked).toBe(0);
        expect(rerun.counts.carts_already_owned).toBe(1);
        expect(rerun.counts.orders_already_owned).toBe(1);
      });

      it("reports mixed evidence and preserves conflicting legacy records", async () => {
        const container = getContainer();
        const cartService = container.resolve(Modules.CART) as any;
        const cart = await cartService.createCarts({
          currency_code: "lyd",
          region_id: fixtures.regionB.id,
          sales_channel_id: fixtures.salesChannelB.id,
        });
        await cartService.addLineItems(cart.id, [
          {
            title: fixtures.productA.title,
            quantity: 1,
            unit_price: 1500,
            variant_id: fixtures.variantA.id,
            product_id: fixtures.productA.id,
          },
        ]);

        const report = await runCheckoutOwnershipBackfill(container);
        expect(report.counts.channel_store_mismatches).toBe(1);
        expect(report.conflicts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              kind: "cart",
              id: cart.id,
              code: "channel_store_mismatch",
            }),
          ]),
        );
        expect(
          await listStoreCartLinks(container, { cart_id: cart.id }),
        ).toHaveLength(0);
        await expect(cartService.retrieveCart(cart.id)).resolves.toBeTruthy();

        expect(
          await listStoreProductLinks(container, {
            product_id: fixtures.productA.id,
          }),
        ).toEqual([
          expect.objectContaining({
            store_id: fixtures.medusaStoreA.id,
          }),
        ]);
      });
    });
  },
});

jest.setTimeout(480_000);
