import { randomBytes, randomUUID } from "node:crypto"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createCreationDraft, readCreationDraft, saveCreationDraft, creationTrialCommand, confirmCreationDraft } from "../../src/api/_utils/store-creation-drafts"
import { creationCatalog } from "../../src/api/_utils/store-creation-contract"
import { readPlatformStorefront } from "../../src/modules/saas/platform-storefront-document"
import { createCheckoutFixtures } from "../helpers/checkout-fixtures"
import { ensureDefaultStorefrontDocument } from "../../src/modules/saas/platform-storefront-document"
import { getOrderIdForCart } from "../../src/api/_utils/cart-store-context"
import { creationStarterProducts, CREATION_TEMPLATE_KEYS } from "../../src/api/_utils/template-creation-presets"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

jest.setTimeout(180_000)
const testEnv = {
  NODE_ENV: "test", JWT_SECRET: randomBytes(32).toString("hex"), COOKIE_SECRET: randomBytes(32).toString("hex"),
  VENDOR_SESSION_SECRET: randomBytes(32).toString("hex"), MEDUSA_FF_RBAC: "true",
  PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID: "creation-test", PROVISIONING_FINGERPRINT_KEYS: JSON.stringify({ "creation-test": randomBytes(32).toString("hex") }),
  SAAS_TEMPORARY_DOMAIN_BASE: "local.test", SAAS_SUPPORTED_CURRENCIES: "lyd",
}
Object.assign(process.env, testEnv)
medusaIntegrationTestRunner({ cwd: process.cwd(), env: testEnv, testSuite: ({ api, getContainer }) => {
  it.each(["standard", "drops", "luxe-commerce-full", "urbx"] as const)("creates an independent, resumable %s store with its exact saved catalog and document", async template => {
    const container = getContainer()
    const requestKey = randomUUID()
    const draft = await createCreationDraft(container, { request_key: requestKey, template_key: template }, "template-check")
    expect(draft.values.document.template_key).toBe(template)
    expect(draft.values.products).toHaveLength(creationStarterProducts(template).length)
    await expect(createCreationDraft(container, { request_key: requestKey, template_key: "glow-beauty" }, "template-check")).rejects.toMatchObject({ type: "conflict" })
    const images = [...draft.values.products.flatMap(p => [p.thumbnail, ...p.images]), ...draft.values.document.hero.slides.map(s => s.image_url), ...draft.values.document.brands.items.flatMap(c => c.image_url ? [c.image_url] : [])]
    for (const image of images) expect({ image, exists: existsSync(resolve(process.cwd(), "../storefront/public", image.slice(1))) }).toEqual({ image, exists: true })
    const values = structuredClone(draft.values)
    const suffix = randomUUID().slice(0, 8)
    values.configuration.name = `Saved ${template} ${suffix}`
    values.configuration.brand.primary_color = "#835ac4"
    values.document.hero.heading.en = "My exact saved heading"
    values.owner = { name: "Template owner", email: `${template}-${suffix}@example.test`, reuse_existing: false }
    values.handle = `tpl-${suffix}`
    values.products[0].title = `Edited ${template} ${suffix}`
    values.products[0].variants[0].amount = 123
    const saved = await saveCreationDraft(container, draft.id, { revision: draft.revision, values })
    expect((await readCreationDraft(container, draft.id)).values).toEqual(values)
    const catalog = creationCatalog(values, draft.id)
    const cart: any = await creationTrialCommand(container, draft.id, { action: "create" })
    const added: any = await creationTrialCommand(container, draft.id, { action: "add", cart_id: cart.id, variant_id: catalog[0].variants[0].id, quantity: 1 })
    expect(added.total).toBe(123)
    const confirmed = await confirmCreationDraft(container, draft.id, { revision: saved.revision, initial_password: randomBytes(24).toString("base64url") }, "template-check")
    expect((await confirmCreationDraft(container, draft.id, { revision: saved.revision }, "template-check")).store_profile_id).toBe(confirmed.store_profile_id)
    const document = await readPlatformStorefront(container, confirmed.store_profile_id!)
    expect(document.storefront.document).toEqual(values.document)
    expect(document.storefront.published_revision).toBeNull()
    const db: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    expect(await db("product").where({ title: values.products[0].title }).whereNull("deleted_at")).toHaveLength(1)
    expect(await db("product_category").whereRaw("metadata ->> 'store_profile_id' = ?", [confirmed.store_profile_id])).toHaveLength(values.document.brands.items.length)
    const next = await createCreationDraft(container, { request_key: randomUUID(), template_key: template }, "template-check")
    expect(next.values.products[0].title).toBe(creationStarterProducts(template)[0].title)
    expect(next.values.configuration.brand.primary_color).not.toBe("#835ac4")
  })
  it("persists isolated drafts and trials, rejects stale saves, and confirms exactly once without resetting the design", async () => {
    const container = getContainer()
    api.defaults.timeout = 15_000
    console.info("[creation-check] Creating isolated administrator")
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10)
    const password = randomBytes(24).toString("base64url")
    const email = `creation-admin-${suffix}@example.test`
    const auth: any = container.resolve(Modules.AUTH)
    const registration = await auth.register("emailpass", { body: { email, password } })
    await createUserAccountWorkflow(container).run({ input: { authIdentityId: registration.authIdentity.id,
      userData: { email, roles: ["role_super_admin"] } } })
    const token = (await api.post("/auth/user/emailpass", { email, password })).data.token
    const headers = { headers: { Authorization: `Bearer ${token}` } }
    const removable = await createCreationDraft(container, { request_key: randomUUID(), template_key: "template-6" }, "delete-check")
    const untouched = await createCreationDraft(container, { request_key: randomUUID(), template_key: "standard" }, "delete-check")
    const deleteUrl = `/admin/saas/creation-drafts/${removable.id}`
    const deleteRequest = { ...headers, data: { revision: removable.revision } }
    const deletionDb: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const trial = await creationTrialCommand(container, removable.id, { action: "create" })
    await deletionDb("store_creation_trial").insert({ id: `sttrial_${randomUUID()}`, draft_id: removable.id, status: "ordered", values: JSON.stringify({ confirmation: { display_id: "TEST-DELETE" } }), deleted_at: deletionDb.fn.now() })
    const otherTrial = await creationTrialCommand(container, untouched.id, { action: "create" })
    await expect(api.delete(deleteUrl, { data: { revision: removable.revision } })).rejects.toMatchObject({ response: { status: 401 } })
    const ordinaryEmail = `draft-member-${suffix}@example.test`
    const ordinaryRegistration = await auth.register("emailpass", { body: { email: ordinaryEmail, password } })
    await createUserAccountWorkflow(container).run({ input: { authIdentityId: ordinaryRegistration.authIdentity.id, userData: { email: ordinaryEmail } } })
    const ordinaryToken = (await api.post("/auth/user/emailpass", { email: ordinaryEmail, password })).data.token
    await expect(api.delete(deleteUrl, { data: { revision: removable.revision }, headers: { Authorization: `Bearer ${ordinaryToken}` } })).rejects.toMatchObject({ response: { status: 403 } })
    await expect(api.delete(deleteUrl, { ...headers, data: { revision: removable.revision + 1 } })).rejects.toMatchObject({ response: { status: 409 } })
    const lockConnection = await deletionDb.client.acquireConnection()
    try {
      await deletionDb.raw("select pg_advisory_lock(hashtextextended(?, 0))", [`creation-confirm:${removable.id}`]).connection(lockConnection)
      await expect(api.delete(deleteUrl, deleteRequest)).rejects.toMatchObject({ response: { status: 409 } })
    } finally {
      await deletionDb.raw("select pg_advisory_unlock(hashtextextended(?, 0))", [`creation-confirm:${removable.id}`]).connection(lockConnection)
      await deletionDb.client.releaseConnection(lockConnection)
    }
    for (const status of ["confirming", "confirmed"]) {
      await deletionDb("store_creation_draft").where({ id: removable.id }).update({ status })
      await expect(api.delete(deleteUrl, deleteRequest)).rejects.toMatchObject({ response: { status: 409 } })
    }
    await deletionDb("store_creation_draft").where({ id: removable.id }).update({ status: "draft" })
    expect((await api.delete(deleteUrl, deleteRequest)).data).toEqual({ id: removable.id, deleted: true })
    // Check physical rows, including deleted_at rows: a hidden draft is not deletion.
    expect(await deletionDb("store_creation_draft").where({ id: removable.id })).toHaveLength(0)
    expect(await deletionDb("store_creation_trial").where({ draft_id: removable.id })).toHaveLength(0)
    expect(await deletionDb("store_creation_trial").where({ id: otherTrial.id })).toHaveLength(1)
    await expect(api.get(deleteUrl, headers)).rejects.toMatchObject({ response: { status: 404 } })
    await expect(api.post(deleteUrl, { revision: removable.revision, values: removable.values }, headers)).rejects.toMatchObject({ response: { status: 404 } })
    await expect(api.post(`${deleteUrl}/trial`, { action: "get", cart_id: trial.id }, headers)).rejects.toMatchObject({ response: { status: 404 } })
    expect((await api.get("/admin/saas/creation-drafts", headers)).data.drafts.some((draft: any) => draft.id === removable.id)).toBe(false)
    expect((await readCreationDraft(container, untouched.id)).values).toEqual(untouched.values)
    await expect(api.get("/admin/saas/storefront-templates")).rejects.toMatchObject({ response: { status: 401 } })
    const previews = (await api.get("/admin/saas/storefront-templates", headers)).data.creation_previews
    for (const template_key of CREATION_TEMPLATE_KEYS) {
      const fresh = (await api.post("/admin/saas/creation-drafts", { request_key: randomUUID(), template_key }, headers)).data.draft
      expect(fresh.values).toEqual(previews[template_key])
    }
    const arabic = (await api.post("/admin/saas/creation-drafts", { request_key: randomUUID(), template_key: "urbx", locale: "ar-LY" }, headers)).data.draft
    expect(arabic.values).toEqual({ ...previews.urbx, configuration: { ...previews.urbx.configuration, locale: "ar-LY" } })
    console.info("[creation-check] Administrator authenticated")
    const request = { request_key: randomUUID(), template_key: "glow-beauty" }
    await expect(api.post("/admin/saas/creation-drafts", request)).rejects.toMatchObject({ response: { status: 401 } })
    const draft = (await api.post("/admin/saas/creation-drafts", request, headers)).data.draft
    expect((await api.post("/admin/saas/creation-drafts", request, headers)).data.draft.id).toBe(draft.id)
    expect(draft.status).toBe("draft")
    console.info("[creation-check] Draft persisted and replayed")
    const second = await createCreationDraft(container, { ...request, request_key: randomUUID() }, "test-actor")
    const values = structuredClone(draft.values)
    values.configuration.name = "Saved Rose Store"
    values.configuration.brand.primary_color = "#b83e68"
    values.document.hero.heading.en = "An edited heading"
    values.owner = { name: "Draft owner", email: `creation-owner-${suffix}@example.test`, reuse_existing: false }
    values.handle = `creation-${suffix}`
    values.products[0].title = "Saved Serum"
    values.products[0].variants[0].amount = 47
    const missingOwner = { ...values, owner: { ...values.owner, reuse_existing: true } }
    const unfinished = await saveCreationDraft(container, second.id, { revision: second.revision,
      values: { ...missingOwner, owner: { ...missingOwner.owner, email: "unfinished@" }, handle: "x" } })
    expect((await readCreationDraft(container, second.id)).values.owner.email).toBe("unfinished@")
    await expect(confirmCreationDraft(container, second.id, { revision: unfinished.revision }, "test-actor")).rejects.toMatchObject({ type: "invalid_data" })
    const provisional = await saveCreationDraft(container, second.id, { revision: unfinished.revision, values: missingOwner })
    await expect(confirmCreationDraft(container, second.id, { revision: provisional.revision }, "test-actor")).rejects.toMatchObject({ type: "invalid_data" })
    expect((await readCreationDraft(container, second.id)).status).toBe("draft")
    const saved = await saveCreationDraft(container, draft.id, { revision: 1, values })
    expect((await readCreationDraft(container, draft.id)).values).toEqual(values)
    expect((await readCreationDraft(container, second.id)).revision).toBe(provisional.revision)
    await expect(saveCreationDraft(container, draft.id, { revision: 1, values })).rejects.toMatchObject({ type: "conflict" })
    const catalog = creationCatalog(values, draft.id)
    const cart: any = await creationTrialCommand(container, draft.id, { action: "create" })
    await expect(creationTrialCommand(container, second.id, { action: "get", cart_id: cart.id })).rejects.toMatchObject({ type: "not_found" })
    await expect(creationTrialCommand(container, draft.id, { action: "add", cart_id: cart.id, variant_id: creationCatalog(second.values, second.id)[0].variants[0].id })).rejects.toMatchObject({ type: "invalid_data" })
    const added: any = await creationTrialCommand(container, draft.id, { action: "add", cart_id: cart.id, variant_id: catalog[0].variants[0].id, quantity: 1 })
    expect(added.total).toBe(47)
    await creationTrialCommand(container, draft.id, { action: "address", cart_id: cart.id,
      address: { email: "customer@example.test", first_name: "Test", last_name: "Customer", phone: "+218910000000", address_1: "Test street", city: "Tripoli", country_code: "ly" } })
    await creationTrialCommand(container, draft.id, { action: "shipping", cart_id: cart.id, option_id: "trial-standard" })
    await creationTrialCommand(container, draft.id, { action: "payment", cart_id: cart.id })
    const order: any = await creationTrialCommand(container, draft.id, { action: "complete", cart_id: cart.id, payment_method: "cod" })
    expect(order.total).toBe(62)
    expect(await creationTrialCommand(container, draft.id, { action: "complete", cart_id: cart.id, payment_method: "cod" })).toEqual(order)
    expect((await creationTrialCommand(container, draft.id, { action: "orders" }) as any[])).toHaveLength(1)
    const completedCart: any = await creationTrialCommand(container, draft.id, { action: "get", cart_id: cart.id })
    const changed = structuredClone(values)
    changed.products[0].variants[0].stock = 0
    changed.products[0].variants[0].amount = 999
    const edited = await saveCreationDraft(container, draft.id, { revision: saved.revision, values: changed })
    expect(await creationTrialCommand(container, draft.id, { action: "get", cart_id: cart.id })).toEqual(completedCart)
    expect(await creationTrialCommand(container, draft.id, { action: "complete", cart_id: cart.id, payment_method: "cod" })).toEqual(order)
    const reviewed = await saveCreationDraft(container, draft.id, { revision: edited.revision, values })
    const confirmed = await confirmCreationDraft(container, draft.id, { revision: reviewed.revision, initial_password: randomBytes(24).toString("base64url") }, "test-actor")
    console.info("[creation-check] Canonical store confirmed")
    expect(confirmed.status).toBe("confirmed")
    expect(confirmed.store_profile_id).toBeTruthy()
    const repeated = await confirmCreationDraft(container, draft.id, { revision: saved.revision }, "test-actor")
    expect(repeated.store_profile_id).toBe(confirmed.store_profile_id)
    const document = await readPlatformStorefront(container, confirmed.store_profile_id!)
    expect(document.storefront.document).toEqual(values.document)
    expect(document.storefront.published_revision).toBeNull()
    const db: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const products = await db("product").where({ title: "Saved Serum" }).whereNull("deleted_at")
    expect(products).toHaveLength(1)
    const categories = await db("product_category").whereRaw("metadata ->> 'store_profile_id' = ?", [confirmed.store_profile_id])
    expect(categories).toHaveLength(values.document.brands.items.length)
    expect(await db("store_creation_trial").where({ draft_id: draft.id, status: "ordered" })).toHaveLength(1)
    await expect(creationTrialCommand(container, draft.id, { action: "create" })).rejects.toMatchObject({ type: "conflict" })
  })
  it("persists real COD orders and exposes only store-bound, merchant-updated tracking", async () => {
    const container = getContainer()
    api.defaults.timeout = 15_000
    const fixtures = await createCheckoutFixtures(container, api)
    await ensureDefaultStorefrontDocument(container, fixtures.storeProfileA.id, "tracking-fixture")
    const headers = { Host: "store-a.example.test", "x-publishable-api-key": fixtures.apiKeyA.token }
    const otherHeaders = { Host: "store-b.example.test", "x-publishable-api-key": fixtures.apiKeyB.token }
    const cart = (await api.post("/store/carts", { region_id: fixtures.regionA.id }, { headers })).data.cart
    await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: fixtures.variantA.id, quantity: 1 }, { headers })
    await api.post(`/store/carts/${cart.id}`, { email: "tracking@example.test", shipping_address: { first_name: "Test", last_name: "Customer", address_1: "Test street", city: "Tripoli", country_code: "ly" } }, { headers })
    await api.post(`/store/carts/${cart.id}/shipping-methods`, { option_id: fixtures.shippingOptionA.id }, { headers })
    const collection = (await api.post("/store/payment-collections", { cart_id: cart.id }, { headers })).data.payment_collection
    await api.post(`/store/payment-collections/${collection.id}/payment-sessions`, { provider_id: "pp_system_default" }, { headers })
    const placed = (await api.post(`/store/saas/carts/${cart.id}/complete`, { payment_method: "cod" }, { headers })).data.order
    expect(placed.tracking.token).toMatch(/^[a-f0-9]{64}$/)
    const request = { token: placed.tracking.token }
    expect((await api.post("/store/saas/order-status", request, { headers })).data.order.progress).toBe("confirmed")
    await expect(api.post("/store/saas/order-status", request, { headers: otherHeaders })).rejects.toMatchObject({ response: { status: 404 } })
    const orderId = await getOrderIdForCart(container, cart.id)
    await expect(api.post(`/vendor/orders/${orderId}/progress`, { revision: 0, status: "processing" }, { headers: { Cookie: fixtures.merchantCookieB } })).rejects.toMatchObject({ response: { status: 404 } })
    const merchant = { headers: { Cookie: fixtures.merchantCookieA } }
    await api.post(`/vendor/orders/${orderId}/progress`, { revision: 0, status: "processing" }, merchant)
    await expect(api.post(`/vendor/orders/${orderId}/progress`, { revision: 0, status: "shipped" }, merchant)).rejects.toMatchObject({ response: { status: 409 } })
    await api.post(`/vendor/orders/${orderId}/progress`, { revision: 1, status: "shipped" }, merchant)
    const status = (await api.post("/store/saas/order-status", request, { headers })).data.order
    expect(status.progress).toBe("shipped")
    expect(status.total).toBe(placed.total)
    expect(status.payment.status).not.toBe("paid")
    const db: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const grants = await db("store_order_tracking_grant").where({ order_id: orderId })
    expect(grants).toHaveLength(1)
    expect(JSON.stringify(grants)).not.toContain(placed.tracking.token)
    expect((await db("store_order_progress").where({ order_id: orderId }).first()).events).toHaveLength(2)
    console.info("[creation-check] Real COD and private manual tracking passed")
  })
} })
