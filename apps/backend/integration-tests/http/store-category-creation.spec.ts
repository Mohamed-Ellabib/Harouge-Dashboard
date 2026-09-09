import { randomBytes, randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { categoryCreationPreset, categoryStarterProducts, STORE_CATEGORY_KEYS } from "../../src/api/_utils/store-creation-catalogs"
import { CREATION_TEMPLATE_KEYS } from "../../src/api/_utils/template-creation-presets"
import { creationValuesSchema } from "../../src/api/_utils/store-creation-contract"
import { createCreationDraft, readCreationDraft, saveCreationDraft, confirmCreationDraft } from "../../src/api/_utils/store-creation-drafts"
import { readPlatformStorefront } from "../../src/modules/saas/platform-storefront-document"

jest.setTimeout(180_000)
const testEnv = {
  NODE_ENV: "test", JWT_SECRET: randomBytes(32).toString("hex"), COOKIE_SECRET: randomBytes(32).toString("hex"),
  VENDOR_SESSION_SECRET: randomBytes(32).toString("hex"), MEDUSA_FF_RBAC: "true",
  PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID: "category-test", PROVISIONING_FINGERPRINT_KEYS: JSON.stringify({ "category-test": randomBytes(32).toString("hex") }),
  SAAS_TEMPORARY_DOMAIN_BASE: "local.test", SAAS_SUPPORTED_CURRENCIES: "lyd",
}
Object.assign(process.env, testEnv)
medusaIntegrationTestRunner({ cwd: process.cwd(), env: testEnv, testSuite: ({ getContainer }) => {
  it("supports every category with every template, valid images and independently copied variants", () => {
    for (const category of STORE_CATEGORY_KEYS) for (const template of CREATION_TEMPLATE_KEYS) {
      const preset = categoryCreationPreset(template, category, true)
      expect(preset.document.template_key).toBe(template)
      const values = { starter_catalog: category, include_starter_products: true,
        configuration: { name: "Sample store", locale: "en-LY", contact: { public_email: null, public_phone: null, whatsapp_number: null }, brand: { logo_url: null, primary_color: preset.primary, secondary_color: preset.background, typography_key: "cairo" } },
        owner: { name: "", email: "", reuse_existing: true }, handle: "", delivery_amount: 15, document: preset.document, products: preset.products }
      expect(creationValuesSchema.safeParse(values).success).toBe(true)
      for (const product of preset.products) for (const image of product.images) expect(existsSync(resolve(process.cwd(), "../storefront/public", image.slice(1)))).toBe(true)
      const original = categoryStarterProducts(category)[0].variants[0].stock
      preset.products[0].variants[0].stock = 0
      expect(categoryStarterProducts(category)[0].variants[0].stock).toBe(original)
    }
  })

  it("pins category choices, preserves old drafts and confirms two isolated catalogs exactly once", async () => {
    const container = getContainer()
    const db: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const created: string[] = []
    for (const template of ["luxe-commerce-full", "standard"] as const) {
      const key = randomUUID()
      const draft = await createCreationDraft(container, { request_key: key, template_key: template, starter_catalog: "home-living", include_starter_products: true }, "category-test")
      expect(draft.values.products).toHaveLength(4)
      expect((await createCreationDraft(container, { request_key: key, template_key: template, starter_catalog: "home-living", include_starter_products: true }, "category-test")).id).toBe(draft.id)
      await expect(createCreationDraft(container, { request_key: key, template_key: template, starter_catalog: "beauty" }, "category-test")).rejects.toMatchObject({ type: "conflict" })
      const suffix = randomUUID().slice(0, 8)
      const values = structuredClone(draft.values)
      values.configuration.name = `Home ${suffix}`; values.configuration.locale = "ar-LY"
      values.owner = { name: "Sample owner", email: `home-${suffix}@example.test`, reuse_existing: false }
      values.handle = `home-${suffix}`
      values.setup = { client_name: `Client ${suffix}`, client_key: `client-${suffix}`, reuse_client: false, custom_hostname: `home-${suffix}.example.test`, plan_code: "professional_commerce" }
      values.document.hero.heading.ar = "متجري الخاص"
      values.products[0].title = `My vase ${suffix}`
      const saved = await saveCreationDraft(container, draft.id, { revision: draft.revision, values })
      await expect(saveCreationDraft(container, draft.id, { revision: saved.revision, values: { ...values, starter_catalog: undefined, include_starter_products: undefined } })).rejects.toBeTruthy()
      const result = await confirmCreationDraft(container, draft.id, { revision: saved.revision, initial_password: randomBytes(24).toString("base64url") }, "category-test")
      expect(result.provisioning.store_profile_id).toBe(result.store_profile_id)
      expect(result.provisioning.custom_domain).toBe(values.setup.custom_hostname)
      expect((await confirmCreationDraft(container, draft.id, { revision: saved.revision }, "category-test")).store_profile_id).toBe(result.store_profile_id)
      const storefront = await readPlatformStorefront(container, result.store_profile_id!)
      expect(storefront.storefront.document).toEqual(values.document)
      expect(storefront.storefront.published_revision).toBeNull()
      expect((await db("store_profile").where({ id: result.store_profile_id }).first()).locale).toBe("ar-LY")
      const products = await db("product").where({ title: values.products[0].title }).whereNull("deleted_at")
      expect(products).toHaveLength(1); created.push(products[0].id)
      expect(await db("product_category").whereRaw("metadata ->> 'store_profile_id' = ?", [result.store_profile_id])).toHaveLength(3)
    }
    expect(new Set(created).size).toBe(2)
    await db("product").where({ id: created[0] }).update({ title: "Edited independently" })
    expect((await db("product").where({ id: created[1] }).first()).title).not.toBe("Edited independently")
    expect(categoryStarterProducts("home-living")[0].title).toBe("Ceramic Vase")
    const legacy = await createCreationDraft(container, { request_key: randomUUID(), template_key: "glow-beauty" }, "category-test")
    expect(legacy.values.starter_catalog).toBeUndefined()
    expect(legacy.values.products).toHaveLength(6)
  })

  it("creates an empty Starter store when samples are excluded", async () => {
    const container = getContainer()
    const draft = await createCreationDraft(container, { request_key: randomUUID(), template_key: "template-6", starter_catalog: "beauty", include_starter_products: false }, "category-test")
    expect(draft.values.products).toEqual([])
    const values = structuredClone(draft.values); const suffix = randomUUID().slice(0, 8)
    values.owner = { name: "Empty owner", email: `empty-${suffix}@example.test`, reuse_existing: false }; values.handle = `empty-${suffix}`
    values.setup = { client_name: "Empty client", client_key: `empty-${suffix}`, reuse_client: false, plan_code: "starter_whatsapp" }
    const saved = await saveCreationDraft(container, draft.id, { revision: draft.revision, values })
    const result = await confirmCreationDraft(container, draft.id, { revision: saved.revision, initial_password: randomBytes(24).toString("base64url") }, "category-test")
    expect(result.provisioning.plan_code).toBe("starter_whatsapp")
    expect((await readPlatformStorefront(container, result.store_profile_id!)).storefront.published_revision).toBeNull()
  })

  it("blocks missing template support before provisioning and resumes a saved Beauty catalog without credentials or duplicates", async () => {
    const container = getContainer()
    const db: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const draft = await createCreationDraft(container, { request_key: randomUUID(), template_key: "urbx", starter_catalog: "beauty" }, "recovery-test")
    const values = structuredClone(draft.values); const suffix = randomUUID().slice(0, 8)
    values.owner = { name: "Recovery owner", email: `recovery-${suffix}@example.test`, reuse_existing: false }
    values.handle = `recovery-${suffix}`
    values.document.appearance = { navbar_background: "#142536", navbar_text_color: "#eeeeee", navbar_active_color: "#d5ff00", text_color: "#fafafa", heading_color: "#abcdef", muted_text_color: "#cccccc", button_text_color: "#111111", surface_color: "#212121", body_font: "cairo", heading_font: "manrope" }
    expect(creationValuesSchema.safeParse({ ...values, document: { ...values.document, appearance: { text_color: "url(unsafe)" } } }).success).toBe(false)
    expect(creationValuesSchema.safeParse({ ...values, document: { ...values.document, appearance: { body_font: "unapproved-font" } } }).success).toBe(false)
    const saved = await saveCreationDraft(container, draft.id, { revision: draft.revision, values })
    const input = { revision: saved.revision, initial_password: randomBytes(24).toString("base64url") }
    const constraint = "storefront_document_revision_template_key_check"
    const original = (await db.raw("select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = 'storefront_document_revision'::regclass and conname = ?", [constraint])).rows[0].definition
    try {
      await db.raw(`alter table storefront_document_revision drop constraint ${constraint}`)
      await db.raw(`alter table storefront_document_revision add constraint ${constraint} check (template_key in ('luxe-commerce','luxe-commerce-full','modern-market','home-living','standard','glow-beauty','drops','template-6'))`)
      await expect(confirmCreationDraft(container, draft.id, input, "recovery-test")).rejects.toMatchObject({ creation_safe: true, message: expect.stringContaining("pending template migrations") })
      expect((await readCreationDraft(container, draft.id)).status).toBe("draft")
      expect(await db("store_profile").where({ handle: values.handle })).toHaveLength(0)
      expect(await db("vendor_member").where({ email: values.owner.email })).toHaveLength(0)
    } finally {
      await db.raw(`alter table storefront_document_revision drop constraint if exists ${constraint}`)
      await db.raw(`alter table storefront_document_revision add constraint ${constraint} ${original}`)
    }
    await db.raw(`create function test_interrupt_template_write() returns trigger language plpgsql as $$ begin
      if new.template_key = 'urbx' then raise exception 'Interrupted presentation write' using errcode = '23514'; end if;
      return new; end $$;
      create trigger test_interrupt_template_write before insert on storefront_document_revision for each row execute function test_interrupt_template_write();`)
    try {
      await expect(confirmCreationDraft(container, draft.id, input, "recovery-test")).rejects.toMatchObject({ creation_safe: true, message: expect.stringContaining("saving the selected template") })
    } finally {
      await db.raw("drop trigger test_interrupt_template_write on storefront_document_revision; drop function test_interrupt_template_write();")
    }
    const interrupted = await readCreationDraft(container, draft.id)
    expect(interrupted.confirmation_progress).toEqual({ owner_and_store: true, commerce: true, catalog: true, presentation: false })
    const productIds = (await db("product").whereNull("deleted_at").select("id")).map((p: any) => p.id).sort()
    const resumed = await confirmCreationDraft(container, draft.id, { revision: saved.revision }, "recovery-test")
    expect(resumed.status).toBe("confirmed")
    expect(resumed.store_profile_id).toBe(interrupted.store_profile_id)
    expect((await db("product").whereNull("deleted_at").select("id")).map((p: any) => p.id).sort()).toEqual(productIds)
    expect(await db("store_profile").where({ handle: values.handle })).toHaveLength(1)
    expect(await db("vendor_member").where({ email: values.owner.email })).toHaveLength(1)
    expect((await readPlatformStorefront(container, resumed.store_profile_id!)).storefront.document).toEqual(values.document)
    expect((await readPlatformStorefront(container, resumed.store_profile_id!)).storefront.published_revision).toBeNull()
  })
} })
