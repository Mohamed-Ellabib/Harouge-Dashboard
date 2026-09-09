import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

import { getOrderIdForCart } from "../../src/api/_utils/cart-store-context"
import {
  defaultStorefrontDocument,
  ensureDefaultStorefrontDocument,
  updatePlatformStorefrontDraft,
} from "../../src/modules/saas/platform-storefront-document"
import {
  createCheckoutFixtures,
  type CheckoutFixtures,
} from "../helpers/checkout-fixtures"

jest.setTimeout(180_000)

const testEnv = {
  NODE_ENV: "test",
  JWT_SECRET: "test-only-jwt-secret-not-for-production",
  COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
  VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
  STORE_CORS: "http://127.0.0.1:5176",
  ADMIN_CORS: "http://127.0.0.1:9000",
  AUTH_CORS: "http://127.0.0.1:5175",
}

const responseStatus = { validateStatus: () => true }

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: testEnv,
  testSuite: ({ api, getContainer }) => {
    describe("Phase 3C manual Store payment methods", () => {
      let fixtures: CheckoutFixtures

      beforeEach(async () => {
        fixtures = await createCheckoutFixtures(getContainer(), api)
        await Promise.all([
          ensureDefaultStorefrontDocument(
            getContainer(),
            fixtures.storeProfileA.id,
            "phase3c-payment-fixture",
          ),
          ensureDefaultStorefrontDocument(
            getContainer(),
            fixtures.storeProfileB.id,
            "phase3c-payment-fixture",
          ),
        ])
      })

      const headersFor = (store: "a" | "b") => ({
        Host:
          store === "a"
            ? "store-a.example.test"
            : "store-b.example.test",
        "x-publishable-api-key":
          store === "a" ? fixtures.apiKeyA.token : fixtures.apiKeyB.token,
      })

      const prepareCheckout = async (store: "a" | "b") => {
        const region = store === "a" ? fixtures.regionA : fixtures.regionB
        const variant = store === "a" ? fixtures.variantA : fixtures.variantB
        const shipping =
          store === "a" ? fixtures.shippingOptionA : fixtures.shippingOptionB
        const headers = headersFor(store)
        const cart = (
          await api.post(
            "/store/carts",
            { region_id: region.id },
            { headers },
          )
        ).data.cart
        await api.post(
          `/store/carts/${cart.id}/line-items`,
          { variant_id: variant.id, quantity: 1 },
          { headers },
        )
        await api.post(
          `/store/carts/${cart.id}`,
          {
            email: `guest-${store}@example.test`,
            shipping_address: {
              first_name: "Store",
              last_name: "Customer",
              address_1: "Test address",
              city: store === "a" ? "Tripoli" : "Tunis",
              country_code: store === "a" ? "ly" : "tn",
            },
          },
          { headers },
        )
        await api.post(
          `/store/carts/${cart.id}/shipping-methods`,
          { option_id: shipping.id },
          { headers },
        )
        const collection = await api.post(
          "/store/payment-collections",
          { cart_id: cart.id },
          { headers },
        )
        await api.post(
          `/store/payment-collections/${collection.data.payment_collection.id}/payment-sessions`,
          { provider_id: "pp_system_default" },
          { headers },
        )
        return cart
      }

      const complete = (
        cartId: string,
        store: "a" | "b",
        paymentMethod: "cod" | "bank_transfer",
      ) =>
        api.post(
          `/store/saas/carts/${cartId}/complete`,
          { payment_method: paymentMethod },
          { headers: headersFor(store), ...responseStatus },
        )

      it("exposes method availability without bank details and rejects incomplete bank checkout", async () => {
        const before = await api.get("/store/saas/commerce-capabilities", {
          headers: headersFor("a"),
        })
        expect(before.data.online_checkout.payment_methods).toEqual(["cod"])

        const bank = {
          bank_name: "Phase 3C Test Bank",
          account_holder_name: "Store A Test Account",
          account_reference: "TEST-REFERENCE-A",
          instructions: {
            ar: "تعليمات اختبار التحويل",
            en: "Use the order number as the transfer reference.",
          },
        }
        await updatePlatformStorefrontDraft(
          getContainer(),
          fixtures.storeProfileA.id,
          {
            revision: 1,
            document: defaultStorefrontDocument(),
            bank_transfer: bank,
          },
          "phase3c-payment-admin",
        )

        const [capability, profile] = await Promise.all([
          api.get("/store/saas/commerce-capabilities", {
            headers: headersFor("a"),
          }),
          api.get("/store/vendors/resolve", { headers: headersFor("a") }),
        ])
        expect(capability.data.online_checkout.payment_methods).toEqual([
          "cod",
          "bank_transfer",
        ])
        expect(JSON.stringify({ capability: capability.data, profile: profile.data }))
          .not.toContain(bank.bank_name)
        expect(JSON.stringify(profile.data)).not.toContain(
          bank.account_reference,
        )

        const cartB = await prepareCheckout("b")
        const unavailable = await complete(cartB.id, "b", "bank_transfer")
        expect(unavailable.status).toBe(400)
        expect(await getOrderIdForCart(getContainer(), cartB.id)).toBeNull()

        const accountCart = await prepareCheckout("a")
        const cartService = getContainer().resolve(Modules.CART) as any
        await cartService.updateCarts(accountCart.id, {
          customer_id: fixtures.customerA.id,
        })
        const anonymousAccountCompletion = await complete(
          accountCart.id,
          "a",
          "cod",
        )
        expect(anonymousAccountCompletion.status).toBe(404)
        expect(
          await getOrderIdForCart(getContainer(), accountCart.id),
        ).toBeNull()
        const database = getContainer().resolve(
          ContainerRegistrationKeys.PG_CONNECTION,
        ) as any
        expect(
          await database("store_order_payment")
            .where({ cart_id: accountCart.id })
            .whereNull("deleted_at"),
        ).toHaveLength(0)

        const cod = await complete(cartB.id, "b", "cod")
        expect(cod.status).toBe(200)
        expect(cod.data.order.payment).toEqual({
          method: "cod",
          status: "pending_fulfillment",
        })
        expect(JSON.stringify(cod.data)).not.toMatch(
          /bank_name|account_holder_name|account_reference|bank_transfer/,
        )

        const concurrentCart = await prepareCheckout("b")
        const [concurrentOne, concurrentTwo] = await Promise.all([
          complete(concurrentCart.id, "b", "cod"),
          complete(concurrentCart.id, "b", "cod"),
        ])
        expect(concurrentOne.status).toBe(200)
        expect(concurrentTwo.status).toBe(200)
        expect(concurrentTwo.data.order.display_id).toBe(
          concurrentOne.data.order.display_id,
        )
        expect(
          await database("store_order_payment")
            .where({ cart_id: concurrentCart.id })
            .whereNull("deleted_at"),
        ).toHaveLength(1)
      })

      it("reveals an immutable Store bank snapshot only after its Order is submitted", async () => {
        const originalBank = {
          bank_name: "Phase 3C Original Bank",
          account_holder_name: "Original Store Account",
          account_reference: "ORIGINAL-REFERENCE-A",
          instructions: {
            ar: "تعليمات التحويل الأصلية",
            en: "Original transfer instructions.\nKeep the receipt for reference.",
          },
        }
        await updatePlatformStorefrontDraft(
          getContainer(),
          fixtures.storeProfileA.id,
          {
            revision: 1,
            document: defaultStorefrontDocument(),
            bank_transfer: originalBank,
          },
          "phase3c-payment-admin",
        )
        const cart = await prepareCheckout("a")

        const directCore = await api.post(
          `/store/carts/${cart.id}/complete`,
          {},
          { headers: headersFor("a"), ...responseStatus },
        )
        expect(directCore.status).toBe(400)
        expect(await getOrderIdForCart(getContainer(), cart.id)).toBeNull()

        const crossed = await complete(cart.id, "b", "bank_transfer")
        expect(crossed.status).toBe(404)
        expect(JSON.stringify(crossed.data)).not.toContain(
          originalBank.bank_name,
        )

        const submitted = await complete(cart.id, "a", "bank_transfer")
        expect(submitted.status).toBe(200)
        expect(submitted.data.order.payment).toEqual({
          method: "bank_transfer",
          status: "pending_verification",
          bank_transfer: {
            bank_name: originalBank.bank_name,
            account_holder_name: originalBank.account_holder_name,
            account_reference: originalBank.account_reference,
            instructions: originalBank.instructions.ar,
          },
        })
        const orderId = await getOrderIdForCart(getContainer(), cart.id)
        expect(typeof orderId).toBe("string")

        const database = getContainer().resolve(
          ContainerRegistrationKeys.PG_CONNECTION,
        ) as any
        const rows = await database("store_order_payment")
          .where({ cart_id: cart.id })
          .whereNull("deleted_at")
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
          store_profile_id: fixtures.storeProfileA.id,
          medusa_store_id: fixtures.medusaStoreA.id,
          order_id: orderId,
          payment_method: "bank_transfer",
          status: "submitted",
          bank_name: originalBank.bank_name,
        })

        const changedBank = {
          bank_name: "Phase 3C Changed Bank",
          account_holder_name: "Changed Store Account",
          account_reference: "CHANGED-REFERENCE-A",
          instructions: {
            ar: "تعليمات جديدة",
            en: "Changed transfer instructions.",
          },
        }
        await updatePlatformStorefrontDraft(
          getContainer(),
          fixtures.storeProfileA.id,
          {
            revision: 2,
            document: defaultStorefrontDocument(),
            bank_transfer: changedBank,
          },
          "phase3c-payment-admin",
        )

        const retry = await complete(cart.id, "a", "bank_transfer")
        expect(retry.status).toBe(200)
        expect(retry.data.order.display_id).toBe(
          submitted.data.order.display_id,
        )
        expect(retry.data.order.payment.bank_transfer.bank_name).toBe(
          originalBank.bank_name,
        )
        expect(JSON.stringify(retry.data)).not.toContain(changedBank.bank_name)

        const changedMethod = await complete(cart.id, "a", "cod")
        expect(changedMethod.status).toBe(409)
        const unknownField = await api.post(
          `/store/saas/carts/${cart.id}/complete`,
          { payment_method: "bank_transfer", internal: true },
          { headers: headersFor("a"), ...responseStatus },
        )
        expect(unknownField.status).toBe(400)
      })
    })
  },
})
