import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { creationValuesSchema, creationSaveSchema, creationCatalog, trialCommandSchema, initialCreationValues, type CreationValues } from "./store-creation-contract"
import { installCreationDraftCatalog } from "./platform-storefront-template-starter"
import { CREATION_TEMPLATE_KEYS } from "./template-creation-presets"
import { STORE_CATEGORY_KEYS } from "./store-creation-catalogs"
import { executeSaasStoreProvisioning } from "../../workflows/provision-saas-store"
import { executeStoreCommerceSetup } from "../../workflows/setup-store-commerce"
import { readPlatformStorefront, updatePlatformStorefrontDraft } from "../../modules/saas/platform-storefront-document"
import { hasActiveMerchantAccountCredential } from "./merchant-account-credentials"

const database = (container: MedusaContainer): any => container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
const invalid = (message: string) => Object.assign(new MedusaError(MedusaError.Types.INVALID_DATA, message), { creation_safe: true })
const conflict = (message: string) => Object.assign(new MedusaError(MedusaError.Types.CONFLICT, message), { creation_safe: true })
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) throw invalid(result.error.issues[0]?.message ?? "Invalid draft content.")
  return result.data
}
async function rowFor(db: any, id: string, lock = false) {
  if (!/^stdraft_[a-f0-9-]{36}$/.test(id)) throw invalid("Invalid creation draft.")
  let query = db("store_creation_draft").where({ id }).whereNull("deleted_at")
  if (lock) query = query.forUpdate()
  const row = await query.first()
  if (!row) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Store draft was not found.")
  return row
}
const view = (row: any) => ({ id: row.id, revision: row.revision, status: row.status, values: parse(creationValuesSchema, row.values),
  confirmation_progress: { owner_and_store: Boolean(row.checkpoints?.provisioning), commerce: Boolean(row.checkpoints?.commerce), catalog: Boolean(row.checkpoints?.catalog), presentation: Boolean(row.checkpoints?.presentation) },
  provisioning: row.status === "confirmed" && row.checkpoints?.provisioning?.tenant_id ? row.checkpoints.provisioning : null,
  store_profile_id: row.store_profile_id, updated_at: row.updated_at, created_at: row.created_at })

async function assertCreationTemplateReady(db: any, templateKey: string) {
  const result = await db.raw("select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = 'storefront_document_revision'::regclass and conname = 'storefront_document_revision_template_key_check'")
  if (!result.rows[0]?.definition?.includes(`'${templateKey}'`)) {
    throw conflict("The selected template needs a platform update before store setup can finish. Your draft is saved. Apply the pending template migrations, then resume this draft.")
  }
}

export async function listCreationDrafts(container: MedusaContainer) {
  const rows = await database(container)("store_creation_draft").whereNull("deleted_at").orderBy("updated_at", "desc").limit(100)
  return rows.map((row: any) => ({ id: row.id, revision: row.revision, status: row.status,
    name: row.values.configuration.name, owner_name: row.values.owner.name, store_profile_id: row.store_profile_id, updated_at: row.updated_at }))
}
export async function readCreationDraft(container: MedusaContainer, id: string) {
  return view(await rowFor(database(container), id))
}
export async function deleteCreationDraft(container: MedusaContainer, id: string, body: unknown) {
  const input = parse(z.object({ revision: z.number().int().positive() }).strict(), body)
  return database(container).transaction(async (tx: any) => {
    // Use the confirmation workflow's lock before the row lock, so a deletion
    // cannot race provisioning or discard its recovery checkpoints.
    const lock = await tx.raw("select pg_try_advisory_xact_lock(hashtextextended(?, 0)) as locked", [`creation-confirm:${id}`])
    if (!lock.rows[0]?.locked) throw conflict("Store setup is running. Wait for it to finish before changing this draft.")
    const row = await rowFor(tx, id, true)
    if (row.status !== "draft" || row.store_profile_id || Object.keys(row.checkpoints ?? {}).length) {
      throw conflict("Store setup has already started. Resume setup or manage the resulting store; it cannot be removed as a draft.")
    }
    if (row.revision !== input.revision) throw conflict("This draft changed in another session. Reload the draft list before deleting it.")
    // Physical deletion includes previously soft-deleted trials and their
    // saved addresses/receipts. Draft designs/products live in the parent JSON.
    await tx("store_creation_trial").where({ draft_id: id }).delete()
    await tx("store_creation_draft").where({ id }).delete()
    return { id, deleted: true }
  })
}
export async function createCreationDraft(container: MedusaContainer, body: unknown, actorId: string) {
  const input = parse(z.object({ request_key: z.string().uuid(), template_key: z.enum(CREATION_TEMPLATE_KEYS),
    locale: z.enum(["en-LY", "ar-LY"]).optional(),
    starter_catalog: z.enum(STORE_CATEGORY_KEYS).optional(), include_starter_products: z.boolean().optional(),
  }).strict().refine(value => value.starter_catalog || value.include_starter_products === undefined, "Choose a store category."), body)
  const db = database(container)
  return db.transaction(async (tx: any) => {
    await tx.raw("select pg_advisory_xact_lock(hashtextextended(?, 0))", [`creation:${input.request_key}`])
    const existing = await tx("store_creation_draft").where({ request_key: input.request_key }).whereNull("deleted_at").first()
    if (existing) {
      if (existing.values.document.template_key !== input.template_key) throw conflict("This creation request belongs to another template. Resume that draft or start a new request.")
      if (existing.values.starter_catalog !== input.starter_catalog || (input.starter_catalog && existing.values.include_starter_products !== (input.include_starter_products ?? true))) throw conflict("This creation request belongs to another starter catalog. Resume that draft or start a new request.")
      return view(existing)
    }
    const values = initialCreationValues(input.template_key, input)
    const [row] = await tx("store_creation_draft").insert({ id: `stdraft_${randomUUID()}`, request_key: input.request_key,
      values: JSON.stringify(parse(creationValuesSchema, values)), created_by: actorId }).returning("*")
    return view(row)
  })
}
export async function saveCreationDraft(container: MedusaContainer, id: string, body: unknown) {
  const input = parse(creationSaveSchema, body)
  return database(container).transaction(async (tx: any) => {
    const current = await rowFor(tx, id, true)
    if (current.status !== "draft") throw conflict("This draft is being confirmed or has already become a Store.")
    if (current.revision !== input.revision) throw conflict("This draft changed in another session. Your unsaved edits were kept; reload before saving.")
    if (current.values.document.template_key !== input.values.document.template_key) throw conflict("A creation draft keeps its selected template. Start another draft to choose a different design.")
    if (current.values.starter_catalog !== input.values.starter_catalog || current.values.include_starter_products !== input.values.include_starter_products) throw conflict("A creation draft keeps its selected starter catalog. Start another draft to choose a different collection.")
    const [row] = await tx("store_creation_draft").where({ id }).update({ values: JSON.stringify(input.values),
      revision: current.revision + 1, updated_at: tx.fn.now() }).returning("*")
    return view(row)
  })
}

export async function confirmCreationDraft(container: MedusaContainer, id: string, body: unknown, actorId: string) {
  const input = parse(z.object({ revision: z.number().int().positive(), initial_password: z.string().min(8).max(128).optional() }).strict(), body)
  const db = database(container)
  // A dedicated session lock serializes cross-workflow work without holding a
  // row transaction across Medusa calls. Process death releases this lock.
  const connection = await db.client.acquireConnection()
  let locked = false
  let stage = "checking the saved draft"
  try {
    const result = await db.raw("select pg_try_advisory_lock(hashtextextended(?, 0)) as locked", [`creation-confirm:${id}`]).connection(connection)
    locked = result.rows[0].locked === true
    if (!locked) throw conflict("This Store is already being confirmed. Wait for it to finish.")
    const row = await db.transaction(async (tx: any) => {
      const current = await rowFor(tx, id, true)
      if (current.status === "confirmed") return current
      if (current.revision !== input.revision) throw conflict("Save and review the latest draft before confirming.")
      const values = parse(creationValuesSchema, current.values)
      // Refuse an unavailable template before creating accounts or commerce
      // resources; older interrupted drafts can resume after the schema update.
      await assertCreationTemplateReady(tx, values.document.template_key)
      if (!values.owner.name || !values.owner.email || !values.handle) throw invalid("Add the owner's name, email and a unique store handle first.")
      if (!z.string().email().safeParse(values.owner.email).success) throw invalid("Complete the owner's email address before confirming.")
      if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(values.handle)) throw invalid("Use a store handle of 2–60 lowercase letters, numbers or hyphens, starting with a letter or number.")
      if (!values.owner.reuse_existing && !input.initial_password && !current.checkpoints.provisioning) throw invalid("Enter a temporary password for the new owner. Passwords are never saved in drafts.")
      // Catch correctable input errors before freezing the draft or creating any
      // provisioning resources. The canonical workflow still enforces uniqueness.
      if (current.status === "draft") {
        const members = await tx("vendor_member").whereNull("deleted_at").whereRaw("lower(trim(email)) = ?", [values.owner.email.toLowerCase()])
        if (values.owner.reuse_existing && (members.length !== 1 || !hasActiveMerchantAccountCredential(members[0]))) throw invalid("Choose an active merchant owner, or create a new account.")
        if (!values.owner.reuse_existing && members.length) throw invalid("This merchant email exists. Select use an existing merchant account.")
        const occupied = await tx("store_profile").where({ handle: values.handle }).whereNull("deleted_at").first("id")
        const legacy = await tx("vendor").where({ handle: values.handle }).whereNull("deleted_at").first("id")
        if (occupied || legacy) throw invalid("Choose a different store handle; this one is already in use.")
      }
      await tx("store_creation_draft").where({ id }).update({ status: "confirming", updated_at: tx.fn.now() })
      return current
    })
    if (row.status === "confirmed") return view(row)
    const values = parse(creationValuesSchema, row.values)
    const checkpoint = async (key: string, value: unknown) => {
      row.checkpoints = { ...row.checkpoints, [key]: value }
      await db("store_creation_draft").where({ id }).update({ checkpoints: JSON.stringify(row.checkpoints), updated_at: db.fn.now() })
    }
    if (!row.checkpoints.provisioning) {
      stage = "creating the owner and store"
      const cfg = values.configuration
      const provisioning = await executeSaasStoreProvisioning(container, { actor_id: actorId, idempotency_key: `creation-${id}`, request: {
        tenant: { name: values.setup?.client_name ?? values.owner.name, key: values.setup?.client_key ?? `client-${id.slice(8)}`, reuse_existing: values.setup?.reuse_client ?? false },
        store: { name: cfg.name, handle: values.handle, plan_code: values.setup?.plan_code ?? "professional_commerce", currency_code: "lyd", locale: cfg.locale, timezone: "Africa/Tripoli" },
        owner: { email: values.owner.email, display_name: values.owner.name, reuse_existing_account: values.owner.reuse_existing,
          ...(!values.owner.reuse_existing ? { initial_password: input.initial_password } : {}) },
        brand: { primary_color: cfg.brand.primary_color ?? "#f35b05", secondary_color: cfg.brand.secondary_color ?? "#fffaf5",
          ...(cfg.brand.logo_url ? { logo_url: cfg.brand.logo_url } : {}) },
        contact: { public_email: cfg.contact.public_email ?? values.owner.email,
          ...(cfg.contact.public_phone ? { public_phone: cfg.contact.public_phone } : {}),
          ...(cfg.contact.whatsapp_number ? { whatsapp_number: cfg.contact.whatsapp_number } : {}) },
        commerce: { region_name: "Libya", countries: ["ly"], stock_location_name: `${cfg.name} inventory`, sales_channel_name: `${cfg.name} sales` },
        domain: values.setup?.custom_hostname ? { custom_hostname: values.setup.custom_hostname } : {},
      } })
      await checkpoint("provisioning", provisioning)
      await db("store_creation_draft").where({ id }).update({ store_profile_id: provisioning.store_profile_id })
    }
    const storeId = row.checkpoints.provisioning.store_profile_id
    if (!row.checkpoints.commerce && values.setup?.plan_code !== "starter_whatsapp") {
      stage = "setting up delivery and checkout"
      await executeStoreCommerceSetup(container, { actor_id: actorId, idempotency_key: `creation-commerce-${id}`, store_profile_id: storeId,
        request: { shipping_option: { name: "Standard Delivery", description: "Delivery within Libya", amount: values.delivery_amount } } })
      await checkpoint("commerce", true)
    }
    if (!row.checkpoints.catalog) {
      stage = "adding the starter products"
      await installCreationDraftCatalog(container, storeId, values.products, values.document.brands.items, values.document.template_key)
      await checkpoint("catalog", true)
    }
    if (!row.checkpoints.presentation) {
      stage = "saving the selected template"
      const current = await readPlatformStorefront(container, storeId)
      if (JSON.stringify(current.storefront.document) !== JSON.stringify(values.document)) {
        if (current.storefront.revision !== 1 || current.storefront.published_revision !== null) throw conflict("Store content changed outside setup. It was not overwritten.")
        await updatePlatformStorefrontDraft(container, storeId, { revision: current.storefront.revision, document: values.document,
          bank_transfer: current.storefront.bank_transfer }, actorId)
      }
      await checkpoint("presentation", true)
    }
    await db("store_creation_draft").where({ id }).update({ status: "confirmed", store_profile_id: storeId, updated_at: db.fn.now() })
    return await readCreationDraft(container, id)
  } catch (error) {
    if (error instanceof Error && (error as any).creation_safe === true) throw error
    if (error instanceof MedusaError && ((error as any).commerce_setup_safe === true || (error as any).provisioning_safe === true)) {
      throw conflict(`Store setup stopped while ${stage}. ${error.message} Completed steps are saved; resume this draft after resolving it.`)
    }
    // Only report a code and source location. Provider messages, SQL, request
    // values and transient credentials must never enter diagnostics.
    const code = typeof (error as any)?.code === "string" && /^[0-9A-Z]{5}$/.test((error as any).code) ? (error as any).code : "unknown"
    const locations = error instanceof Error ? [...(error.stack ?? "").matchAll(/[\\/]([\w-]+\.[cm]?[jt]s):(\d+):(\d+)/g)].slice(0, 5).map(match => `${match[1]}:${match[2]}:${match[3]}`).join(", ") : ""
    container.resolve(ContainerRegistrationKeys.LOGGER).warn(`Creation confirmation stopped while ${stage}; code=${code}; source=${locations}`)
    throw conflict(`Store setup stopped while ${stage}. Completed steps are saved. Resume this draft to retry the remaining setup.`)
  } finally {
    let reusable = true
    if (locked) {
      try {
        const result = await db.raw("select pg_advisory_unlock(hashtextextended(?, 0)) as unlocked", [`creation-confirm:${id}`]).connection(connection)
        reusable = result?.rows?.[0]?.unlocked === true
      } catch { reusable = false }
    }
    if (reusable) await db.client.releaseConnection(connection)
    else await db.client.destroyConnection(connection)
  }
}

export async function creationTrialCommand(container: MedusaContainer, draftId: string, body: unknown) {
  const command = parse(trialCommandSchema, body)
  return database(container).transaction(async (tx: any) => {
    const draft = await rowFor(tx, draftId, true)
    const values = parse(creationValuesSchema, draft.values)
    const catalog = creationCatalog(values, draftId)
    if (command.action === "orders") {
      const orders = await tx("store_creation_trial").where({ draft_id: draftId, status: "ordered" }).orderBy("created_at", "desc").limit(25)
      return orders.map((order: any) => ({ ...order.values.confirmation, test_order: true, progress: "confirmed", created_at: order.created_at }))
    }
    if (draft.status !== "draft") throw conflict("Trial checkout is closed while this Store is being confirmed. Test orders remain separate.")
    if (command.action === "create") {
      const [created] = await tx("store_creation_trial").insert({ id: `sttrial_${randomUUID()}`, draft_id: draftId, values: JSON.stringify({ items: [], shipping: false, payment: false }) }).returning("*")
      return trialCart(created, values, catalog)
    }
    if (!command.cart_id) throw invalid("A draft-owned trial cart is required.")
    const row = await tx("store_creation_trial").where({ id: command.cart_id, draft_id: draftId }).whereNull("deleted_at").forUpdate().first()
    if (!row) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Trial cart was not found.")
    if (command.action === "get") return row.status === "ordered" && row.values.completed_cart ? row.values.completed_cart : trialCart(row, values, catalog)
    if (command.action === "complete" && row.status === "ordered") return row.values.confirmation
    if (row.status !== "cart") throw conflict("This test order has already been submitted.")
    const state = row.values
    const line = state.items.find((item: any) => item.id === command.line_id)
    switch (command.action) {
      case "add": {
        const found = catalog.flatMap(p => p.variants).find(v => v.id === command.variant_id)
        if (!found) throw invalid("This variant does not belong to the draft.")
        const existing = state.items.find((item: any) => item.variant_id === command.variant_id)
        if (existing) existing.quantity += command.quantity ?? 1
        else state.items.push({ id: `line-${randomUUID()}`, variant_id: command.variant_id, quantity: command.quantity ?? 1 })
        if (state.items.length > 30) throw invalid("Trial carts support up to 30 lines.")
        break
      }
      case "quantity": if (!line || !command.quantity) throw invalid("Choose a cart line and quantity."); line.quantity = command.quantity; break
      case "remove": if (!line) throw invalid("Choose a cart line."); state.items = state.items.filter((item: any) => item.id !== command.line_id); break
      case "address": if (!command.address) throw invalid("Enter a delivery address."); state.address = command.address; state.shipping = false; state.payment = false; break
      case "shipping-options": return [{ id: "trial-standard", name: "Standard Delivery", amount: values.delivery_amount }]
      case "shipping": if (!state.address || command.option_id !== "trial-standard") throw invalid("Save a delivery address first."); state.shipping = true; break
      case "payment": if (!state.shipping) throw invalid("Choose delivery first."); state.payment = true; break
      case "complete": {
        if (!state.address || !state.shipping || !state.payment || command.payment_method !== "cod" || !state.items.length) throw invalid("Complete the address, delivery and COD selection first.")
        const cart = trialCart(row, values, catalog)
        state.completed_cart = { ...cart, completed: true }
        state.confirmation = { display_id: `TEST-${row.id.slice(-8).toUpperCase()}`, currency_code: "lyd",
          items: cart.items.map(({ title, variant_title, quantity, unit_price, total, thumbnail_url }: any) => ({ title, variant_title, quantity, unit_price, total, thumbnail_url })),
          item_subtotal: cart.item_subtotal, shipping_total: cart.shipping_total, total: cart.total,
          payment: { method: "cod", status: "pending_fulfillment" } }
        row.status = "ordered"
        break
      }
    }
    const cart = trialCart(row, values, catalog)
    await tx("store_creation_trial").where({ id: row.id }).update({ status: row.status, values: JSON.stringify(state), updated_at: tx.fn.now() })
    return command.action === "complete" ? state.confirmation : cart
  })
}
function trialCart(row: any, values: CreationValues, catalog: ReturnType<typeof creationCatalog>) {
  const items = row.values.items.map((line: any) => {
    const product = catalog.find(p => p.variants.some(v => v.id === line.variant_id))
    const index = product?.variants.findIndex(v => v.id === line.variant_id) ?? -1
    const variant = product?.variants[index]
    const source = values.products.find(p => p.slug === product?.handle)?.variants[index]
    if (!product || !variant || !source || line.quantity > source.stock || line.quantity > 20) throw conflict("A trial item is unavailable or exceeds its saved stock. Update the cart.")
    return { ...line, title: product.title, product_handle: product.handle, variant_title: variant.title, thumbnail_url: product.thumbnail_url, unit_price: variant.unit_price, total: Math.round(variant.unit_price * line.quantity * 1000) / 1000 }
  })
  const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0)
  const shipping = row.values.shipping ? values.delivery_amount : 0
  return { id: row.id, currency_code: "lyd", email: row.values.address?.email ?? null, items,
    item_subtotal: subtotal, shipping_total: shipping, total: Math.round((subtotal + shipping) * 1000) / 1000,
    shipping_method_selected: Boolean(row.values.shipping), payment_session_ready: Boolean(row.values.payment), completed: row.status === "ordered" }
}
