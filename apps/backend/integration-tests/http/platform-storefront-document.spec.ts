import { randomUUID } from "node:crypto"

import { createUserAccountWorkflow } from "@medusajs/core-flows"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

import {
  defaultStorefrontDocument,
  storefrontDocumentV1Schema,
  listPlatformStorefrontTemplates,
  publishPlatformStorefront,
  readPlatformStorefront,
  readPublishedStorefront,
  updatePlatformStorefrontDraft,
} from "../../src/modules/saas/platform-storefront-document"
import { Migration20260814100000 } from "../../src/modules/saas/migrations/Migration20260814100000"
import { Migration20260814110000 } from "../../src/modules/saas/migrations/Migration20260814110000"
import { executeSaasStoreProvisioning } from "../../src/workflows/provision-saas-store"
import { executeStoreCommerceSetup } from "../../src/workflows/setup-store-commerce"
import { provisioningRequest } from "../helpers/provisioning-fixtures"

jest.setTimeout(180_000)

const fingerprintKeyId = "storefront-document-test-v1"
const testEnv = {
  NODE_ENV: "test",
  JWT_SECRET: "test-only-jwt-secret-not-for-production",
  COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
  VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
  MEDUSA_FF_RBAC: "true",
  PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID: fingerprintKeyId,
  PROVISIONING_FINGERPRINT_KEYS: JSON.stringify({
    [fingerprintKeyId]: "test-only-storefront-document-key-at-least-32-characters",
  }),
  SAAS_TEMPORARY_DOMAIN_BASE: "local.test",
  SAAS_SUPPORTED_CURRENCIES: "lyd",
  STORE_CORS: "http://127.0.0.1:5176",
  ADMIN_CORS: "http://127.0.0.1:9000",
  AUTH_CORS: "http://127.0.0.1:5175",
}

Object.assign(process.env, testEnv)

const nextSuffix = () => randomUUID().replace(/-/g, "").slice(0, 12)

const provision = async (
  container: any,
  label: string,
  planCode: "starter_whatsapp" | "professional_commerce" = "starter_whatsapp",
) => {
  const suffix = nextSuffix()
  return await executeSaasStoreProvisioning(container, {
    idempotency_key: `storefront-document:${label}:${suffix}`,
    actor_id: "user_super_admin_test",
    request: provisioningRequest({ suffix, planCode }),
  })
}

const completeDocument = (heading = "Storefront") => {
  const document = defaultStorefrontDocument()
  const localized = (field: string) => ({ ar: `عربي ${field}`, en: `English ${field}` })
  document.hero.eyebrow = localized("eyebrow")
  document.hero.heading = { ar: `واجهة ${heading}`, en: heading }
  document.hero.subheading = localized("subheading")
  document.hero.cta_label = localized("cta")
  document.hero.slides = Array.from({ length: 4 }, (_, index) => ({
    id: `hero-slide-${index + 1}`,
    image_url: `/assets/luxe-full/test-hero-${index + 1}.webp`,
    alt: localized(`hero image ${index + 1}`),
    enabled: true,
  }))
  document.hero.buttons = [
    {
      id: "hero-button-catalog",
      label: localized("catalog button"),
      href: "/best-sellers",
      background_color: "#b77f3f",
      text_color: "#ffffff",
      style: "solid",
      enabled: true,
    },
    {
      id: "hero-button-contact",
      label: localized("contact button"),
      href: "#contact",
      background_color: "#17243a",
      text_color: "#ffffff",
      style: "outline",
      enabled: true,
    },
  ]
  document.about.title = localized("about title")
  document.about.body = localized("about body")
  document.contact.heading = localized("contact title")
  document.contact.body = localized("contact body")
  for (const key of ["delivery", "returns", "privacy", "terms"] as const) {
    document.policies[key].title = localized(`${key} title`)
    document.policies[key].body = localized(`${key} body`)
  }
  return document
}

const emptyBank = {
  bank_name: null,
  account_holder_name: null,
  account_reference: null,
  instructions: { ar: "", en: "" },
}

const createPlatformUser = async (
  container: any,
  email: string,
  password: string,
  roles: string[] = [],
) => {
  const auth = container.resolve(Modules.AUTH) as any
  const registration = await auth.register("emailpass", { body: { email, password } })
  if (!registration.success || !registration.authIdentity?.id) {
    throw new Error("The test platform identity could not be created.")
  }
  const { result } = await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId: registration.authIdentity.id,
      userData: { email, first_name: "Storefront", last_name: "Tester", roles },
    },
  })
  return result
}

const authenticate = async (api: any, email: string, password: string) =>
  (await api.post("/auth/user/emailpass", { email, password })).data.token as string

const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: testEnv,
  testSuite: ({ api, getContainer }) => {
    describe("platform Storefront documents", () => {
      it("protects the admin routes with a real Super Admin session", async () => {
        const container = getContainer()
        const store = await provision(container, "auth")
        const suffix = nextSuffix()
        const regularEmail = `storefront-regular-${suffix}@example.test`
        const superEmail = `storefront-super-${suffix}@example.test`
        const regularPassword = "Test-Only-Regular-Password-001"
        const superPassword = "Test-Only-Super-Password-001"
        await createPlatformUser(container, regularEmail, regularPassword)
        await createPlatformUser(container, superEmail, superPassword, ["role_super_admin"])
        const [regularToken, superToken] = await Promise.all([
          authenticate(api, regularEmail, regularPassword),
          authenticate(api, superEmail, superPassword),
        ])
        const url = `/admin/saas/stores/${store.store_profile_id}/storefront`
        await expect(api.get(url)).rejects.toMatchObject({ response: { status: 401 } })
        await expect(api.get(url, bearer(regularToken))).rejects.toMatchObject({
          response: { status: 403 },
        })
        const allowed = await api.get(url, bearer(superToken))
        expect(allowed.status).toBe(200)
        expect(allowed.data.storefront).toMatchObject({
          revision: 1,
          latest_revision: 1,
          published_revision: null,
          status: "unpublished",
        })
        const draftBody = {
          revision: 1,
          document: completeDocument("Authorized Storefront"),
          bank_transfer: emptyBank,
        }
        await expect(api.put(`${url}/draft`, draftBody)).rejects.toMatchObject({
          response: { status: 401 },
        })
        await expect(
          api.put(`${url}/draft`, draftBody, bearer(regularToken)),
        ).rejects.toMatchObject({ response: { status: 403 } })
        const saved = await api.put(`${url}/draft`, draftBody, bearer(superToken))
        expect(saved.data.storefront.revision).toBe(2)
        const previewUrl = `${url}/preview?revision=2`
        await expect(api.get(previewUrl)).rejects.toMatchObject({
          response: { status: 401 },
        })
        await expect(api.get(previewUrl, bearer(regularToken))).rejects.toMatchObject({
          response: { status: 403 },
        })
        const preview = await api.get(previewUrl, bearer(superToken))
        expect(preview.data).toMatchObject({
          revision: 2,
          storefront: { hero: { heading: { en: "Authorized Storefront" } } },
        })
        await expect(
          api.post(`${url}/publish`, { draft_revision: 2 }),
        ).rejects.toMatchObject({ response: { status: 401 } })
        await expect(
          api.post(
            `${url}/publish`,
            { draft_revision: 2 },
            bearer(regularToken),
          ),
        ).rejects.toMatchObject({ response: { status: 403 } })
        const published = await api.post(
          `${url}/publish`,
          { draft_revision: 2 },
          bearer(superToken),
        )
        expect(published.data.storefront.published_revision).toBe(2)
        const beforeInvalid = await api.get(url, bearer(superToken))
        const unknownDocument: any = completeDocument("Unknown HTTP Field")
        unknownDocument.policies.delivery.internal_notes = "not allowed"
        await expect(
          api.put(
            `${url}/draft`,
            {
              revision: 2,
              document: unknownDocument,
              bank_transfer: emptyBank,
            },
            bearer(superToken),
          ),
        ).rejects.toMatchObject({ response: { status: 400 } })
        const overlengthDocument = completeDocument("Overlength HTTP Field")
        overlengthDocument.contact.heading.en = "x".repeat(161)
        await expect(
          api.put(
            `${url}/draft`,
            {
              revision: 2,
              document: overlengthDocument,
              bank_transfer: emptyBank,
            },
            bearer(superToken),
          ),
        ).rejects.toMatchObject({ response: { status: 400 } })
        expect((await api.get(url, bearer(superToken))).data).toEqual(
          beforeInvalid.data,
        )
        const templates = await api.get(
          "/admin/saas/storefront-templates",
          bearer(superToken),
        )
        expect(templates.data.templates.map((entry: any) => entry.key)).toEqual([
          "luxe-commerce",
          "luxe-commerce-full",
          "modern-market",
          "home-living",
          "standard",
          "glow-beauty",
        ])
      })

      it("installs Glow Beauty as an idempotent real Store catalog and editor preview", async () => {
        const container = getContainer()
        const store = await provision(container, "glow-starter", "professional_commerce")
        await executeStoreCommerceSetup(container, {
          idempotency_key: `storefront-glow-commerce:${store.store_profile_id}`,
          actor_id: "user_super_admin_glow_test",
          store_profile_id: store.store_profile_id,
          request: {
            shipping_option: {
              name: "Libya standard delivery",
              description: "Delivery confirmed at checkout.",
              amount: 15,
            },
          },
        })

        const suffix = nextSuffix()
        const email = `storefront-glow-super-${suffix}@example.test`
        const password = "Test-Only-Glow-Password-001"
        await createPlatformUser(container, email, password, ["role_super_admin"])
        const token = await authenticate(api, email, password)
        const starterUrl = `/admin/saas/stores/${store.store_profile_id}/storefront/starter`

        await expect(api.post(starterUrl, {
          template_key: "glow-beauty",
          revision: 1,
        })).rejects.toMatchObject({ response: { status: 401 } })

        const installed = await api.post(
          starterUrl,
          { template_key: "glow-beauty", revision: 1 },
          bearer(token),
        )
        expect(installed.data).toMatchObject({
          starter: {
            template_key: "glow-beauty",
            catalog_status: "created",
            product_count: 6,
          },
          storefront: {
            revision: 2,
            document: {
              template_key: "glow-beauty",
              hero: {
                image_url: "/assets/glow-beauty/hero-beauty-collection.png",
              },
            },
          },
        })

        const preview = await api.get(
          `/admin/saas/stores/${store.store_profile_id}/storefront-preview`,
          bearer(token),
        )
        expect(preview.data.storefront.product_count).toBe(6)
        expect(preview.data.storefront.products).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: "Radiance Serum",
              thumbnail_url: "/assets/glow-beauty/product-radiance-serum.png",
              image_urls: expect.arrayContaining([
                "/assets/glow-beauty/product-radiance-serum-detail.png",
              ]),
              price_lyd: 125,
              compare_at_price_lyd: 160,
              category: "Skincare",
              badge: "BEST SELLER",
              options: expect.arrayContaining([
                expect.objectContaining({
                  name: "size",
                  values: expect.arrayContaining(["30 ml", "50 ml", "100 ml"]),
                }),
                expect.objectContaining({
                  name: "color",
                  values: expect.arrayContaining(["Rose", "Pearl"]),
                }),
              ]),
            }),
          ]),
        )
        const radiance = preview.data.storefront.products.find(
          (product: any) => product.title === "Radiance Serum",
        )
        expect(radiance.variants).toHaveLength(6)
        expect(radiance.variants.every((variant: any) =>
          variant.available_for_sale &&
          /^editor-preview:/.test(variant.id) &&
          !/^variant_/.test(variant.id),
        )).toBe(true)

        const replay = await api.post(
          starterUrl,
          { template_key: "glow-beauty", revision: 2 },
          bearer(token),
        )
        expect(replay.data.starter.catalog_status).toBe("already_installed")
        expect(replay.data.storefront.revision).toBe(2)
      })

      it("keeps drafts private, enforces CAS, publishes idempotently, and isolates Stores", async () => {
        const container = getContainer()
        const [storeA, storeB] = await Promise.all([
          provision(container, "a"),
          provision(container, "b"),
        ])
        const initialA = await readPlatformStorefront(container, storeA.store_profile_id)
        const initialB = await readPlatformStorefront(container, storeB.store_profile_id)
        expect(initialA.storefront.revision).toBe(1)
        expect(initialB.storefront.revision).toBe(1)
        await expect(
          readPublishedStorefront(container, storeA.store_profile_id),
        ).resolves.toBeNull()

        const saved = await updatePlatformStorefrontDraft(
          container,
          storeA.store_profile_id,
          { revision: 1, document: completeDocument("First"), bank_transfer: emptyBank },
          "user_admin_a",
        )
        expect(saved.storefront.revision).toBe(2)
        await expect(
          readPublishedStorefront(container, storeA.store_profile_id),
        ).resolves.toBeNull()
        expect(
          (await readPlatformStorefront(container, storeB.store_profile_id)).storefront,
        ).toEqual(initialB.storefront)

        const concurrent = await Promise.allSettled([
          updatePlatformStorefrontDraft(
            container,
            storeA.store_profile_id,
            { revision: 2, document: completeDocument("Winner One"), bank_transfer: emptyBank },
            "user_admin_one",
          ),
          updatePlatformStorefrontDraft(
            container,
            storeA.store_profile_id,
            { revision: 2, document: completeDocument("Winner Two"), bank_transfer: emptyBank },
            "user_admin_two",
          ),
        ])
        expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1)
        expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1)
        expect(
          (concurrent.find((result) => result.status === "rejected") as PromiseRejectedResult)
            .reason,
        ).toMatchObject({ type: MedusaError.Types.CONFLICT })

        const current = await readPlatformStorefront(container, storeA.store_profile_id)
        const firstPublish = await publishPlatformStorefront(
          container,
          storeA.store_profile_id,
          { draft_revision: current.storefront.revision },
          "user_publisher",
        )
        const secondPublish = await publishPlatformStorefront(
          container,
          storeA.store_profile_id,
          { draft_revision: current.storefront.revision },
          "user_other_publisher",
        )
        expect(secondPublish.storefront.published_at).toBe(
          firstPublish.storefront.published_at,
        )
        expect(secondPublish.storefront.published_by).toBe("user_publisher")

        const publicStorefront = await readPublishedStorefront(
          container,
          storeA.store_profile_id,
        )
        const {
          schema_version: _schemaVersion,
          template_key: _templateKey,
          ...expectedContent
        } = current.storefront.document
        expect(publicStorefront).toEqual({
          schema_version: 1,
          template_key: "modern-market",
          content: expectedContent,
        })
        const serialized = JSON.stringify(publicStorefront)
        for (const privateKey of [
          "bank_transfer",
          "bank_name",
          "account_reference",
          "revision",
          "updated_by",
          "published_by",
        ]) {
          expect(serialized).not.toContain(privateKey)
        }

        const keyService = container.resolve(Modules.API_KEY) as any
        const [keyA, keyB] = await Promise.all([
          keyService.retrieveApiKey(storeA.publishable_api_key_id),
          keyService.retrieveApiKey(storeB.publishable_api_key_id),
        ])
        const resolve = (host: string, token: string, query = "") =>
          api.get(`/store/vendors/resolve${query}`, {
            headers: {
              Host: host,
              "x-publishable-api-key": token,
            },
            validateStatus: () => true,
          })
        const publicA = await resolve(
          storeA.public_domain,
          keyA.token,
          `?domain=${encodeURIComponent(storeB.public_domain)}`,
        )
        expect(publicA.status).toBe(200)
        expect(publicA.data.vendor.storefront).toEqual(publicStorefront)
        expect(JSON.stringify(publicA.data.vendor.storefront)).not.toContain(
          "bank_transfer",
        )
        const publicB = await resolve(storeB.public_domain, keyB.token)
        expect(publicB.status).toBe(200)
        expect(publicB.data.vendor.storefront).toBeNull()
        const crossed = await resolve(storeA.public_domain, keyB.token)
        expect(crossed.status).toBe(404)
      })

      it("rejects unsafe or partial content without mutation", async () => {
        const container = getContainer()
        const store = await provision(container, "invalid")
        const initial = await readPlatformStorefront(container, store.store_profile_id)
        const markup = completeDocument("Invalid")
        markup.about.body.en = "<script>alert(1)</script>"
        await expect(
          updatePlatformStorefrontDraft(
            container,
            store.store_profile_id,
            { revision: 1, document: markup, bank_transfer: emptyBank },
            "user_admin",
          ),
        ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
        const unsafeImage = completeDocument("Unsafe")
        unsafeImage.hero.image_url = "http://169.254.169.254/metadata"
        await expect(
          updatePlatformStorefrontDraft(
            container,
            store.store_profile_id,
            { revision: 1, document: unsafeImage, bank_transfer: emptyBank },
            "user_admin",
          ),
        ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
        const unknownField: any = completeDocument("Unknown")
        unknownField.hero.internal_notes = "must not be accepted"
        await expect(
          updatePlatformStorefrontDraft(
            container,
            store.store_profile_id,
            { revision: 1, document: unknownField, bank_transfer: emptyBank },
            "user_admin",
          ),
        ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
        const overlength = completeDocument("Overlength")
        overlength.hero.heading.en = "x".repeat(161)
        await expect(
          updatePlatformStorefrontDraft(
            container,
            store.store_profile_id,
            { revision: 1, document: overlength, bank_transfer: emptyBank },
            "user_admin",
          ),
        ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
        expect(await readPlatformStorefront(container, store.store_profile_id)).toEqual(initial)

        const partial = await updatePlatformStorefrontDraft(
          container,
          store.store_profile_id,
          {
            revision: 1,
            document: completeDocument("Partial Bank"),
            bank_transfer: {
              ...emptyBank,
              bank_name: "Test Bank",
            },
          },
          "user_admin",
        )
        await expect(
          publishPlatformStorefront(
            container,
            store.store_profile_id,
            { draft_revision: partial.storefront.revision },
            "user_admin",
          ),
        ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
        expect(
          (await readPlatformStorefront(container, store.store_profile_id)).storefront
            .published_revision,
        ).toBeNull()
      })

      it("fails public reads closed for malformed or incomplete persisted revisions", async () => {
        const container = getContainer()
        const store = await provision(container, "persisted-invalid")
        const database = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
        const document = await database("storefront_document")
          .where({ store_profile_id: store.store_profile_id })
          .first()
        await database("storefront_document_revision").insert({
          id: `stdrev_malformed_${nextSuffix()}`,
          storefront_document_id: document.id,
          store_profile_id: store.store_profile_id,
          revision: 2,
          schema_version: 1,
          template_key: "modern-market",
          document: { schema_version: 1 },
          created_by: "test_corruption_fixture",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })
        await database("storefront_document")
          .where({ id: document.id })
          .update({
            latest_revision: 2,
            published_revision: 2,
            published_by: "test_corruption_fixture",
            published_at: new Date(),
            updated_at: new Date(),
          })
        await expect(
          readPublishedStorefront(container, store.store_profile_id),
        ).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })

        await database("storefront_document")
          .where({ id: document.id })
          .update({ published_revision: 1, updated_at: new Date() })
        await expect(
          readPublishedStorefront(container, store.store_profile_id),
        ).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
      })

      it("counts template assignments as the draft/published Store union", async () => {
        const container = getContainer()
        const store = await provision(container, "template-switch")
        const saved = await updatePlatformStorefrontDraft(
          container,
          store.store_profile_id,
          {
            revision: 1,
            document: completeDocument("Published Modern Market"),
            bank_transfer: emptyBank,
          },
          "user_template_admin",
        )
        await publishPlatformStorefront(
          container,
          store.store_profile_id,
          { draft_revision: saved.storefront.revision },
          "user_template_admin",
        )
        const before = await listPlatformStorefrontTemplates(container)
        const beforeModern = before.templates.find(
          (template) => template.key === "modern-market",
        )!
        const beforeLuxe = before.templates.find(
          (template) => template.key === "luxe-commerce",
        )!

        const switched = completeDocument("Draft Luxe Commerce")
        switched.template_key = "luxe-commerce"
        await updatePlatformStorefrontDraft(
          container,
          store.store_profile_id,
          {
            revision: saved.storefront.revision,
            document: switched,
            bank_transfer: emptyBank,
          },
          "user_template_admin",
        )
        const after = await listPlatformStorefrontTemplates(container)
        const afterModern = after.templates.find(
          (template) => template.key === "modern-market",
        )!
        const afterLuxe = after.templates.find(
          (template) => template.key === "luxe-commerce",
        )!

        expect(afterModern.assignments.total).toBe(
          beforeModern.assignments.total,
        )
        expect(afterModern.assignments.published).toBe(
          beforeModern.assignments.published,
        )
        expect(afterLuxe.assignments.total).toBe(
          beforeLuxe.assignments.total + 1,
        )
        expect(afterLuxe.assignments.published).toBe(
          beforeLuxe.assignments.published,
        )
        expect(afterLuxe.assignments.unpublished_changes).toBe(
          beforeLuxe.assignments.unpublished_changes + 1,
        )
        for (const template of after.templates) {
          expect(template.assignments.published).toBeLessThanOrEqual(
            template.assignments.total,
          )
        }
      })

      it("enforces immutable and Store-bound revision rows in PostgreSQL", async () => {
        const container = getContainer()
        const [storeA, storeB] = await Promise.all([
          provision(container, "constraints-a"),
          provision(container, "constraints-b"),
        ])
        const database = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
        const documentA = await database("storefront_document")
          .where({ store_profile_id: storeA.store_profile_id })
          .first()
        const revisionA = await database("storefront_document_revision")
          .where({ storefront_document_id: documentA.id, revision: 1 })
          .first()
        await expect(
          database("storefront_document_revision")
            .where({ id: revisionA.id })
            .update({ created_by: "mutated" }),
        ).rejects.toBeDefined()
        await expect(
          database("storefront_document_revision").insert({
            id: `stdrev_cross_${nextSuffix()}`,
            storefront_document_id: documentA.id,
            store_profile_id: storeB.store_profile_id,
            revision: 99,
            schema_version: 1,
            template_key: "modern-market",
            document: defaultStorefrontDocument(),
            created_by: null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          }),
        ).rejects.toBeDefined()
      })

      it("backfills existing Stores empty and unpublished, then corrects the applied compatibility migration", async () => {
        const container = getContainer()
        const database = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
        await database.raw(
          "drop table if exists store_manual_bank_transfer_configuration cascade",
        )
        await database.raw("drop table if exists storefront_document_revision cascade")
        await database.raw("drop table if exists storefront_document cascade")
        await database.raw(
          "drop function if exists reject_storefront_document_revision_mutation()",
        )

        const suffix = nextSuffix()
        const tenantId = `tenant_migration_${suffix}`
        const eligibleId = `stprof_migration_ready_${suffix}`
        const pendingId = `stprof_migration_pending_${suffix}`
        await database("tenant").insert({
          id: tenantId,
          key: `migration-${suffix}`,
          name: "Migration Test Tenant",
          status: "active",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })
        await database("store_profile").insert([
          {
            id: eligibleId,
            tenant_id: tenantId,
            handle: `migration-ready-${suffix}`,
            status: "active",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
          {
            id: pendingId,
            tenant_id: tenantId,
            handle: `migration-pending-${suffix}`,
            status: "active",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ])
        await database("store_commerce_readiness").insert([
          {
            id: `stready_migration_ready_${suffix}`,
            store_profile_id: eligibleId,
            plan_code: "professional_commerce",
            status: "ready",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
          {
            id: `stready_migration_pending_${suffix}`,
            store_profile_id: pendingId,
            plan_code: "professional_commerce",
            status: "pending",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        ])

        const statements: string[] = []
        const migration = Object.create(Migration20260814100000.prototype) as any
        migration.addSql = (sql: string) => statements.push(sql)
        await migration.up()
        for (const statement of statements) await database.raw(statement)

        const [eligible, pending] = await Promise.all([
          database("storefront_document")
            .where({ store_profile_id: eligibleId })
            .first(),
          database("storefront_document")
            .where({ store_profile_id: pendingId })
            .first(),
        ])
        expect(eligible).toMatchObject({
          latest_revision: 1,
          draft_revision: 1,
          published_revision: null,
          published_by: null,
        })
        expect(pending).toMatchObject({
          latest_revision: 1,
          draft_revision: 1,
          published_revision: null,
          published_by: null,
        })
        const initialRevisions = await database("storefront_document_revision")
          .whereIn("store_profile_id", [eligibleId, pendingId])
          .where({ revision: 1 })
          .orderBy("store_profile_id")
        expect(initialRevisions).toHaveLength(2)
        for (const revision of initialRevisions) {
          expect(storefrontDocumentV1Schema.parse(revision.document)).toEqual(
            defaultStorefrontDocument(),
          )
        }
        await expect(
          readPublishedStorefront(container, eligibleId),
        ).resolves.toBeNull()
        expect(pending.published_revision).toBeNull()
        await expect(
          readPublishedStorefront(container, pendingId),
        ).resolves.toBeNull()

        const preservedDraft = completeDocument("Preserved Administrator Draft")
        await updatePlatformStorefrontDraft(
          container,
          pendingId,
          { revision: 1, document: preservedDraft, bank_transfer: emptyBank },
          "user_existing_admin",
        )
        await database("storefront_document")
          .whereIn("store_profile_id", [eligibleId, pendingId])
          .update({
            published_revision: 1,
            published_by: "system:phase-3c-compatibility-backfill",
            published_at: new Date(),
            updated_at: new Date(),
          })

        const correctiveStatements: string[] = []
        const corrective = Object.create(Migration20260814110000.prototype) as any
        corrective.addSql = (sql: string) => correctiveStatements.push(sql)
        await corrective.up()
        for (const statement of correctiveStatements) await database.raw(statement)

        const [correctedEligible, correctedPending] = await Promise.all([
          database("storefront_document")
            .where({ store_profile_id: eligibleId })
            .first(),
          database("storefront_document")
            .where({ store_profile_id: pendingId })
            .first(),
        ])
        expect(correctedEligible).toMatchObject({
          latest_revision: 2,
          draft_revision: 2,
          published_revision: null,
          published_by: null,
          draft_updated_by: "system:phase-3c-corrective-unpublish",
        })
        expect(correctedPending).toMatchObject({
          latest_revision: 2,
          draft_revision: 2,
          published_revision: null,
          published_by: null,
          draft_updated_by: "user_existing_admin",
        })
        const correctedEligibleDraft = await database("storefront_document_revision")
          .where({ storefront_document_id: correctedEligible.id, revision: 2 })
          .first()
        const preservedPendingDraft = await database("storefront_document_revision")
          .where({ storefront_document_id: correctedPending.id, revision: 2 })
          .first()
        expect(correctedEligibleDraft.created_by).toBe(
          "system:phase-3c-corrective-unpublish",
        )
        expect(storefrontDocumentV1Schema.parse(correctedEligibleDraft.document)).toEqual(
          defaultStorefrontDocument(),
        )
        expect(preservedPendingDraft.document).toEqual(preservedDraft)
        const eligibleBank = await database(
          "store_manual_bank_transfer_configuration",
        )
          .where({ store_profile_id: eligibleId })
          .first()
        expect(eligibleBank).toMatchObject({
          revision: 2,
          updated_by: "system:phase-3c-corrective-unpublish",
        })
        await expect(
          readPublishedStorefront(container, eligibleId),
        ).resolves.toBeNull()
        await expect(
          readPublishedStorefront(container, pendingId),
        ).resolves.toBeNull()

        for (const statement of correctiveStatements) await database.raw(statement)
        const revisionCount = await database("storefront_document_revision")
          .whereIn("store_profile_id", [eligibleId, pendingId])
          .count("id as count")
          .first()
        expect(Number(revisionCount?.count)).toBe(4)
      })
    })
  },
})
