import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  generateEntityId,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "zod"

import { isAllowedPublicImageUrl } from "./presentation-validation"

export const STOREFRONT_TEMPLATE_KEYS = [
  "luxe-commerce",
  "luxe-commerce-full",
  "modern-market",
  "home-living",
  "standard",
  "glow-beauty",
  "drops",
  "urbx",
  "template-6",
] as const

const STORE_PROFILE_ID = /^[A-Za-z0-9_-]{1,128}$/
const LOCK_PREFIX = "platform-storefront-document:"
const INLINE_CONTROL = /[\u0000-\u001f\u007f]/
const BODY_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const MARKUP = /[<>]/
const HERO_ITEM_ID = /^[A-Za-z0-9_-]{1,80}$/
const BRAND_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export const STOREFRONT_BENEFIT_ICON_KEYS = [
  "award",
  "shield",
  "truck",
  "package",
  "check",
  "heart",
  "globe",
  "clock",
  "headset",
  "sparkle",
] as const

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message)

const conflict = () =>
  new MedusaError(
    MedusaError.Types.CONFLICT,
    "Storefront content changed in another session. Reload and try again.",
  )

const plainText = (maximum: number, multiline: boolean) =>
  z
    .string()
    .max(maximum)
    .transform((value) =>
      (multiline ? value.replace(/\r\n?/g, "\n") : value)
        .trim()
        .normalize("NFC"),
    )
    .refine(
      (value) => !(multiline ? BODY_CONTROL : INLINE_CONTROL).test(value),
      "Text contains unsupported control characters.",
    )
    .refine((value) => !MARKUP.test(value), "Markup is not allowed.")

const localized = (maximum: number, multiline = false) =>
  z
    .object({
      ar: plainText(maximum, multiline),
      en: plainText(maximum, multiline),
    })
    .strict()

const nullablePlainText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    plainText(maximum, false).nullable(),
  )

const policySchema = z
  .object({
    title: localized(160),
    body: localized(6000, true),
  })
  .strict()

const isAllowedStorefrontLink = (value: string) => {
  if (!value || value.length > 2048 || /[\\\u0000-\u001f\u007f<>]/.test(value)) {
    return false
  }
  if (value.startsWith("#")) return /^#[A-Za-z0-9_-]{1,128}$/.test(value)
  if (value.startsWith("/") && !value.startsWith("//")) {
    return !value.includes("..")
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

const heroSlideSchema = z
  .object({
    id: z.string().regex(HERO_ITEM_ID),
    image_url: z
      .string()
      .trim()
      .max(2048)
      .refine(isAllowedPublicImageUrl, {
        message: "Use an uploaded image or a public HTTPS image URL.",
      }),
    alt: localized(160),
    enabled: z.boolean(),
  })
  .strict()

const heroButtonSchema = z
  .object({
    id: z.string().regex(HERO_ITEM_ID),
    label: localized(60),
    href: z.string().trim().max(2048).refine(isAllowedStorefrontLink, {
      message: "Use a safe Storefront path, section link, or public HTTPS URL.",
    }),
    background_color: z.string().regex(HEX_COLOR),
    text_color: z.string().regex(HEX_COLOR),
    style: z.enum(["solid", "outline"]),
    enabled: z.boolean(),
  })
  .strict()

const heroBenefitSchema = z
  .object({
    id: z.string().regex(HERO_ITEM_ID),
    icon: z.enum(STOREFRONT_BENEFIT_ICON_KEYS),
    title: localized(60),
    subtitle: localized(80),
  })
  .strict()

const defaultHeroBenefits = () => [
  { id: "hero-benefit-authentic", icon: "award" as const, title: { ar: "أصلية 100%", en: "100% authentic" }, subtitle: { ar: "منتجات موثوقة", en: "AUTHENTIC" } },
  { id: "hero-benefit-distributor", icon: "award" as const, title: { ar: "موزع رسمي", en: "Official distributor" }, subtitle: { ar: "وكيل معتمد", en: "OFFICIAL DISTRIBUTOR" } },
  { id: "hero-benefit-warranty", icon: "shield" as const, title: { ar: "ضمان دولي", en: "International warranty" }, subtitle: { ar: "تغطية موثوقة", en: "INTERNATIONAL WARRANTY" } },
  { id: "hero-benefit-delivery", icon: "truck" as const, title: { ar: "توصيل سريع", en: "Fast delivery" }, subtitle: { ar: "داخل ليبيا", en: "FAST DELIVERY" } },
]

const storefrontBrandSchema = z
  .object({
    id: z.string().regex(HERO_ITEM_ID),
    name: localized(80),
    slug: z.string().trim().min(1).max(80).regex(BRAND_SLUG),
    banner_image_url: z.string().trim().max(2048).refine(isAllowedPublicImageUrl).nullable().optional(),
    image_url: z
      .string()
      .trim()
      .max(2048)
      .refine(isAllowedPublicImageUrl, {
        message: "Use an uploaded image or a public HTTPS image URL.",
      })
      .nullable(),
  })
  .strict()

const defaultStorefrontBrands = () => ({
  heading: { ar: "علاماتنا التجارية", en: "Our brands" },
  subheading: {
    ar: "نقدم لكم نخبة من أشهر الماركات العالمية",
    en: "A curated selection of world-renowned brands",
  },
  items: [
    { id: "brand-hugo", name: { ar: "HUGO", en: "HUGO" }, slug: "hugo", image_url: null },
    { id: "brand-michael-kors", name: { ar: "MICHAEL KORS", en: "MICHAEL KORS" }, slug: "michael-kors", image_url: null },
    { id: "brand-just-cavalli", name: { ar: "Just Cavalli", en: "Just Cavalli" }, slug: "just-cavalli", image_url: null },
    { id: "brand-cavalli", name: { ar: "cavalli TIME", en: "cavalli TIME" }, slug: "cavalli", image_url: null },
    { id: "brand-fossil", name: { ar: "FOSSIL", en: "FOSSIL" }, slug: "fossil", image_url: null },
    { id: "brand-armani", name: { ar: "EMPORIO ARMANI", en: "EMPORIO ARMANI" }, slug: "emporio-armani", image_url: null },
    { id: "brand-timberland", name: { ar: "Timberland", en: "Timberland" }, slug: "timberland", image_url: null },
    { id: "brand-lacoste", name: { ar: "LACOSTE", en: "LACOSTE" }, slug: "lacoste", image_url: null },
  ],
})

const storefrontBrandsSchema = z
  .object({
    heading: localized(160),
    subheading: localized(300, true),
    search_placeholder: localized(80).optional(),
    explore_label: localized(60).optional(),
    view_all_label: localized(60).optional(),
    promotion_heading: localized(100).optional(),
    promotion_subheading: localized(160, true).optional(),
    promotion_image_url: z.string().trim().max(2048).refine(isAllowedPublicImageUrl).nullable().optional(),
    items: z.array(storefrontBrandSchema).max(16),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = new Set(value.items.map((item) => item.id))
    const slugs = new Set(value.items.map((item) => item.slug))
    if (ids.size !== value.items.length) {
      context.addIssue({ code: "custom", path: ["items"], message: "Brands must use unique identifiers." })
    }
    if (slugs.size !== value.items.length) {
      context.addIssue({ code: "custom", path: ["items"], message: "Brands must use unique slugs." })
    }
  })

export const STOREFRONT_NAVIGATION_KEYS = [
  "home",
  "categories",
  "favorites",
  "cart",
  "account",
  "orders",
  "settings",
] as const

const navigationItemSchema = z
  .object({
    key: z.enum(STOREFRONT_NAVIGATION_KEYS),
    label: localized(60),
    enabled: z.boolean(),
  })
  .strict()

const defaultNavigation = () => ({
  items: [
    { key: "home" as const, label: { ar: "الرئيسية", en: "Main" }, enabled: true },
    { key: "categories" as const, label: { ar: "التصنيفات", en: "Categories" }, enabled: true },
    { key: "favorites" as const, label: { ar: "المفضلة", en: "Favorites" }, enabled: false },
    { key: "cart" as const, label: { ar: "السلة", en: "Cart" }, enabled: false },
    { key: "account" as const, label: { ar: "الحساب", en: "Account" }, enabled: false },
    { key: "orders" as const, label: { ar: "الطلبات", en: "Orders" }, enabled: false },
    { key: "settings" as const, label: { ar: "الإعدادات", en: "Settings" }, enabled: false },
  ],
})

const navigationSchema = z
  .object({ items: z.array(navigationItemSchema).length(STOREFRONT_NAVIGATION_KEYS.length) })
  .strict()
  .superRefine((value, context) => {
    const keys = new Set(value.items.map((item) => item.key))
    for (const key of STOREFRONT_NAVIGATION_KEYS) {
      if (!keys.has(key)) {
        context.addIssue({ code: "custom", message: `Navigation item ${key} is required.` })
      }
    }
  })

export const storefrontDocumentV1Schema = z
  .object({
    schema_version: z.literal(1),
    template_key: z.enum(STOREFRONT_TEMPLATE_KEYS),
    appearance: z.object({
      text_color: z.string().regex(HEX_COLOR).optional(),
      heading_color: z.string().regex(HEX_COLOR).optional(),
      muted_text_color: z.string().regex(HEX_COLOR).optional(),
      button_text_color: z.string().regex(HEX_COLOR).optional(),
      surface_color: z.string().regex(HEX_COLOR).optional(),
      navbar_background: z.string().regex(HEX_COLOR).optional(),
      navbar_text_color: z.string().regex(HEX_COLOR).optional(),
      navbar_active_color: z.string().regex(HEX_COLOR).optional(),
      body_font: z.enum(["original","cairo","manrope","condensed","anton","marker","system","serif"]).optional(),
      heading_font: z.enum(["original","cairo","manrope","condensed","anton","marker","system","serif"]).optional(),
    }).strict().optional(),
    shop: z.object({ heading: localized(60), statement: localized(60), search_placeholder: localized(80) }).strict().optional(),
    home: z.object({
      eyebrow: localized(60), heading: localized(100), statement: localized(60),
      cta_label: localized(60), categories_heading: localized(60), products_heading: localized(60),
      view_all_label: localized(60), promotion_eyebrow: localized(60),
      promotion_heading: localized(100), promotion_detail: localized(100),
      image_url: z.string().trim().max(2048).refine(isAllowedPublicImageUrl),
      promotion_image_url: z.string().trim().max(2048).refine(isAllowedPublicImageUrl),
    }).strict().optional(),
    navigation: navigationSchema.default(defaultNavigation),
    hero: z
      .object({
        eyebrow: localized(80),
        heading: localized(160),
        subheading: localized(600, true),
        cta_label: localized(60),
        cta_target: z.enum(["catalog", "contact"]),
        image_url: z
          .string()
          .trim()
          .max(2048)
          .refine(isAllowedPublicImageUrl, {
            message: "Use an uploaded image or a public HTTPS image URL.",
          })
          .nullable(),
        slides: z.array(heroSlideSchema).max(12).default([]),
        buttons: z.array(heroButtonSchema).max(5).default([]),
        benefits: z.array(heroBenefitSchema).max(8).default(defaultHeroBenefits),
      })
      .strict()
      .superRefine((value, context) => {
        for (const [key, items] of [["slides", value.slides], ["buttons", value.buttons], ["benefits", value.benefits]] as const) {
          const ids = new Set(items.map((item) => item.id))
          if (ids.size !== items.length) {
            context.addIssue({ code: "custom", path: [key], message: `Hero ${key} must use unique identifiers.` })
          }
        }
      }),
    brands: storefrontBrandsSchema.default(defaultStorefrontBrands),
    about: z
      .object({
        title: localized(160),
        body: localized(6000, true),
      })
      .strict(),
    contact: z
      .object({
        heading: localized(160),
        body: localized(3000, true),
      })
      .strict(),
    policies: z
      .object({
        delivery: policySchema,
        returns: policySchema,
        privacy: policySchema,
        terms: policySchema,
      })
      .strict(),
  })
  .strict()

/**
 * Private operational configuration. Its revision advances with the draft CAS,
 * but it is intentionally neither embedded in immutable public revisions nor
 * serialized to customers; checkout disclosure is a separate Phase 3C slice.
 */
export const bankTransferConfigurationSchema = z
  .object({
    bank_name: nullablePlainText(160),
    account_holder_name: nullablePlainText(160),
    account_reference: nullablePlainText(160),
    instructions: localized(3000, true),
  })
  .strict()

const updateDraftSchema = z
  .object({
    revision: z.number().int().min(1).max(2_147_483_646),
    document: storefrontDocumentV1Schema,
    bank_transfer: bankTransferConfigurationSchema,
  })
  .strict()

const publishSchema = z
  .object({
    draft_revision: z.number().int().min(1).max(2_147_483_647),
  })
  .strict()

export type StorefrontDocumentV1 = z.infer<typeof storefrontDocumentV1Schema>
export type BankTransferConfiguration = z.infer<
  typeof bankTransferConfigurationSchema
>

const emptyLocalized = () => ({ ar: "", en: "" })

export const defaultStorefrontDocument = (): StorefrontDocumentV1 => ({
  schema_version: 1,
  template_key: "modern-market",
  navigation: defaultNavigation(),
  hero: {
    eyebrow: emptyLocalized(),
    heading: emptyLocalized(),
    subheading: emptyLocalized(),
    cta_label: emptyLocalized(),
    cta_target: "catalog",
    image_url: null,
    slides: [],
    buttons: [],
    benefits: defaultHeroBenefits(),
  },
  brands: defaultStorefrontBrands(),
  about: { title: emptyLocalized(), body: emptyLocalized() },
  contact: { heading: emptyLocalized(), body: emptyLocalized() },
  policies: {
    delivery: { title: emptyLocalized(), body: emptyLocalized() },
    returns: { title: emptyLocalized(), body: emptyLocalized() },
    privacy: { title: emptyLocalized(), body: emptyLocalized() },
    terms: { title: emptyLocalized(), body: emptyLocalized() },
  },
})

export const defaultBankTransferConfiguration =
  (): BankTransferConfiguration => ({
    bank_name: null,
    account_holder_name: null,
    account_reference: null,
    instructions: emptyLocalized(),
  })

const isoOrNull = (value: unknown) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const validateProfileId = (storeProfileId: string) => {
  if (!STORE_PROFILE_ID.test(storeProfileId)) {
    throw invalid("A valid Store profile is required.")
  }
}

const validateActor = (actorId: string) => {
  if (!actorId || actorId.length > 255 || INLINE_CONTROL.test(actorId)) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "A verified platform administrator is required.",
    )
  }
}

const databaseFor = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

const withSafeDatabaseError = async <T>(operation: () => Promise<T>) => {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof MedusaError) throw error
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The Storefront content could not be processed safely.",
    )
  }
}

const loadAggregate = async (
  transaction: any,
  storeProfileId: string,
  lock: boolean,
) => {
  let profileQuery = transaction("store_profile")
    .where({ id: storeProfileId })
    .whereNull("deleted_at")
  if (lock) profileQuery = profileQuery.forUpdate()
  const profile = await profileQuery.first()
  if (!profile) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Store not found.")
  }

  let documentQuery = transaction("storefront_document")
    .where({ store_profile_id: storeProfileId })
    .whereNull("deleted_at")
  if (lock) documentQuery = documentQuery.forUpdate()
  const documents = await documentQuery
  if (documents.length !== 1) {
    throw invalid("The Store has missing or ambiguous Storefront content.")
  }
  const documentRecord = documents[0]

  let revisionQuery = transaction("storefront_document_revision")
    .where({
      storefront_document_id: documentRecord.id,
      store_profile_id: storeProfileId,
      revision: documentRecord.draft_revision,
    })
    .whereNull("deleted_at")
  if (lock) revisionQuery = revisionQuery.forUpdate()
  const revisions = await revisionQuery
  if (revisions.length !== 1) {
    throw invalid("The Storefront draft revision is unavailable.")
  }

  let bankQuery = transaction("store_manual_bank_transfer_configuration")
    .where({
      storefront_document_id: documentRecord.id,
      store_profile_id: storeProfileId,
    })
    .whereNull("deleted_at")
  if (lock) bankQuery = bankQuery.forUpdate()
  const banks = await bankQuery
  if (banks.length !== 1) {
    throw invalid("The Store bank transfer configuration is unavailable.")
  }

  return {
    profile,
    documentRecord,
    revisionRecord: revisions[0],
    bankRecord: banks[0],
  }
}

const parseStoredDocument = (value: unknown) => {
  const result = storefrontDocumentV1Schema.safeParse(value)
  if (!result.success) {
    throw invalid("The stored Storefront document is invalid.")
  }
  return result.data
}

const parseStoredBank = (record: Record<string, any>) => {
  const result = bankTransferConfigurationSchema.safeParse({
    bank_name: record.bank_name ?? null,
    account_holder_name: record.account_holder_name ?? null,
    account_reference: record.account_reference ?? null,
    instructions: record.instructions,
  })
  if (!result.success) {
    throw invalid("The stored bank transfer configuration is invalid.")
  }
  return result.data
}

const statusFor = (record: Record<string, any>) =>
  record.published_revision == null
    ? ("unpublished" as const)
    : Number(record.published_revision) === Number(record.draft_revision)
      ? ("published" as const)
      : ("draft_changes" as const)

const serializeAdminAggregate = (aggregate: Awaited<ReturnType<typeof loadAggregate>>) => ({
  storefront: {
    revision: Number(aggregate.documentRecord.draft_revision),
    latest_revision: Number(aggregate.documentRecord.latest_revision),
    published_revision:
      aggregate.documentRecord.published_revision == null
        ? null
        : Number(aggregate.documentRecord.published_revision),
    status: statusFor(aggregate.documentRecord),
    document: parseStoredDocument(aggregate.revisionRecord.document),
    bank_transfer: parseStoredBank(aggregate.bankRecord),
    updated_at: isoOrNull(aggregate.documentRecord.draft_updated_at),
    updated_by: aggregate.documentRecord.draft_updated_by ?? null,
    published_at: isoOrNull(aggregate.documentRecord.published_at),
    published_by: aggregate.documentRecord.published_by ?? null,
  },
})

export type PlatformStorefrontAdminRecord = ReturnType<
  typeof serializeAdminAggregate
>

const withLockedAggregate = async <T>(
  container: MedusaContainer,
  storeProfileId: string,
  operation: (
    transaction: any,
    aggregate: Awaited<ReturnType<typeof loadAggregate>>,
  ) => Promise<T>,
) => {
  validateProfileId(storeProfileId)
  return await withSafeDatabaseError<T>(() =>
    databaseFor(container).transaction(async (transaction: any) => {
      await transaction.raw(
        "select pg_advisory_xact_lock(hashtextextended(?, 0))",
        [`${LOCK_PREFIX}${storeProfileId}`],
      )
      return await operation(
        transaction,
        await loadAggregate(transaction, storeProfileId, true),
      )
    }),
  )
}

export const ensureDefaultStorefrontDocument = async (
  container: MedusaContainer,
  storeProfileId: string,
  actorId: string | null,
): Promise<void> => {
  validateProfileId(storeProfileId)
  return await withSafeDatabaseError(() =>
    databaseFor(container).transaction(async (transaction: any) => {
      await transaction.raw(
        "select pg_advisory_xact_lock(hashtextextended(?, 0))",
        [`${LOCK_PREFIX}${storeProfileId}`],
      )
      const profile = await transaction("store_profile")
        .where({ id: storeProfileId })
        .whereNull("deleted_at")
        .forUpdate()
        .first()
      if (!profile) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Store not found.")
      }
      const existing = await transaction("storefront_document")
        .where({ store_profile_id: storeProfileId })
        .whereNull("deleted_at")
        .forUpdate()
      if (existing.length > 1) {
        throw invalid("The Store has ambiguous Storefront content.")
      }
      if (existing.length === 1) {
        await loadAggregate(transaction, storeProfileId, true)
        return
      }

      const now = new Date()
      const document = defaultStorefrontDocument()
      const storefrontDocumentId = generateEntityId(undefined, "stdoc")
      await transaction("storefront_document").insert({
        id: storefrontDocumentId,
        store_profile_id: storeProfileId,
        latest_revision: 1,
        draft_revision: 1,
        published_revision: null,
        draft_updated_by: actorId,
        draft_updated_at: now,
        published_by: null,
        published_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      await transaction("storefront_document_revision").insert({
        id: generateEntityId(undefined, "stdrev"),
        storefront_document_id: storefrontDocumentId,
        store_profile_id: storeProfileId,
        revision: 1,
        schema_version: 1,
        template_key: document.template_key,
        document,
        created_by: actorId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      const bank = defaultBankTransferConfiguration()
      await transaction("store_manual_bank_transfer_configuration").insert({
        id: generateEntityId(undefined, "stbank"),
        storefront_document_id: storefrontDocumentId,
        store_profile_id: storeProfileId,
        bank_name: bank.bank_name,
        account_holder_name: bank.account_holder_name,
        account_reference: bank.account_reference,
        instructions: bank.instructions,
        revision: 1,
        updated_by: actorId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
    }),
  )
}

export const readPlatformStorefront = async (
  container: MedusaContainer,
  storeProfileId: string,
): Promise<PlatformStorefrontAdminRecord> => {
  validateProfileId(storeProfileId)
  return await withSafeDatabaseError(() =>
    databaseFor(container).transaction(
      async (transaction: any) =>
        serializeAdminAggregate(
          await loadAggregate(transaction, storeProfileId, false),
        ),
      { isolationLevel: "repeatable read", readOnly: true },
    ),
  )
}

export const updatePlatformStorefrontDraft = async (
  container: MedusaContainer,
  storeProfileId: string,
  body: unknown,
  actorId: string,
): Promise<PlatformStorefrontAdminRecord> => {
  const parsed = updateDraftSchema.safeParse(body)
  if (!parsed.success) {
    throw invalid(
      parsed.error.issues[0]?.message ?? "The Storefront draft is invalid.",
    )
  }
  validateActor(actorId)

  return await withLockedAggregate<PlatformStorefrontAdminRecord>(
    container,
    storeProfileId,
    async (transaction, aggregate) => {
      const current = Number(aggregate.documentRecord.draft_revision)
      const latest = Number(aggregate.documentRecord.latest_revision)
      if (current !== parsed.data.revision || latest !== current) {
        throw conflict()
      }
      const next = latest + 1
      const now = new Date()
      const document = parsed.data.document
      const bank = parsed.data.bank_transfer
      await transaction("storefront_document_revision").insert({
        id: generateEntityId(undefined, "stdrev"),
        storefront_document_id: aggregate.documentRecord.id,
        store_profile_id: storeProfileId,
        revision: next,
        schema_version: 1,
        template_key: document.template_key,
        document,
        created_by: actorId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      const updated = await transaction("storefront_document")
        .where({ id: aggregate.documentRecord.id, draft_revision: current })
        .update({
          latest_revision: next,
          draft_revision: next,
          draft_updated_by: actorId,
          draft_updated_at: now,
          updated_at: now,
        })
      if (updated !== 1) throw conflict()
      const bankUpdated = await transaction("store_manual_bank_transfer_configuration")
        .where({ id: aggregate.bankRecord.id })
        .update({
          bank_name: bank.bank_name,
          account_holder_name: bank.account_holder_name,
          account_reference: bank.account_reference,
          instructions: bank.instructions,
          revision: next,
          updated_by: actorId,
          updated_at: now,
        })
      if (bankUpdated !== 1) {
        throw invalid("The Store bank transfer configuration changed unexpectedly.")
      }
      return await serializeAdminAggregate(
        await loadAggregate(transaction, storeProfileId, false),
      )
    },
  )
}

const isPublishableDocument = (document: StorefrontDocumentV1) => {
  const localizedValues = [
    ...[document.brands.search_placeholder, document.brands.explore_label, document.brands.view_all_label, document.brands.promotion_heading, document.brands.promotion_subheading].filter((value): value is { ar: string; en: string } => Boolean(value)),
    ...Object.values(document.shop ?? {}),
    ...Object.values(document.home ?? {}).filter((value): value is { ar: string; en: string } => typeof value !== "string"),
    ...document.navigation.items.map((item) => item.label),
    document.hero.eyebrow,
    document.hero.heading,
    document.hero.subheading,
    document.hero.cta_label,
    ...document.hero.buttons.map((button) => button.label),
    ...document.hero.benefits.flatMap((benefit) => [benefit.title, benefit.subtitle]),
    ...(document.brands.items.length
      ? [document.brands.heading, document.brands.subheading, ...document.brands.items.map((brand) => brand.name)]
      : []),
    document.about.title,
    document.about.body,
    document.contact.heading,
    document.contact.body,
    document.policies.delivery.title,
    document.policies.delivery.body,
    document.policies.returns.title,
    document.policies.returns.body,
    document.policies.privacy.title,
    document.policies.privacy.body,
    document.policies.terms.title,
    document.policies.terms.body,
  ]
  return localizedValues.every((value) => value.ar && value.en)
}

const requirePublishable = (document: StorefrontDocumentV1) => {
  if (!isPublishableDocument(document)) {
    throw invalid("Complete all Arabic and English content before publishing.")
  }
}

const requirePublishableBank = (bank: BankTransferConfiguration) => {
  const values = [
    bank.bank_name,
    bank.account_holder_name,
    bank.account_reference,
    bank.instructions.ar || null,
    bank.instructions.en || null,
  ]
  const populated = values.filter(Boolean).length
  if (populated !== 0 && populated !== values.length) {
    throw invalid(
      "Complete all bank transfer fields in Arabic and English, or leave them all empty.",
    )
  }
}

export const publishPlatformStorefront = async (
  container: MedusaContainer,
  storeProfileId: string,
  body: unknown,
  actorId: string,
): Promise<PlatformStorefrontAdminRecord> => {
  const parsed = publishSchema.safeParse(body)
  if (!parsed.success) {
    throw invalid(
      parsed.error.issues[0]?.message ?? "The publish request is invalid.",
    )
  }
  validateActor(actorId)
  return await withLockedAggregate<PlatformStorefrontAdminRecord>(
    container,
    storeProfileId,
    async (transaction, aggregate) => {
      const draftRevision = Number(aggregate.documentRecord.draft_revision)
      if (draftRevision !== parsed.data.draft_revision) throw conflict()
      requirePublishable(parseStoredDocument(aggregate.revisionRecord.document))
      requirePublishableBank(parseStoredBank(aggregate.bankRecord))
      if (Number(aggregate.documentRecord.published_revision) === draftRevision) {
        return serializeAdminAggregate(aggregate)
      }
      const now = new Date()
      await transaction("storefront_document")
        .where({ id: aggregate.documentRecord.id })
        .update({
          published_revision: draftRevision,
          published_by: actorId,
          published_at: now,
          updated_at: now,
        })
      return await serializeAdminAggregate(
        await loadAggregate(transaction, storeProfileId, false),
      )
    },
  )
}

export const readPlatformStorefrontPreview = async (
  container: MedusaContainer,
  storeProfileId: string,
  revision: unknown,
) => {
  const requested = z.coerce.number().int().min(1).safeParse(revision)
  if (!requested.success) throw invalid("A valid draft revision is required.")
  const record = (await readPlatformStorefront(
    container,
    storeProfileId,
  )) as ReturnType<typeof serializeAdminAggregate>
  if (record.storefront.revision !== requested.data) throw conflict()
  return {
    storefront: record.storefront.document,
    revision: record.storefront.revision,
  }
}

export const readPublishedStorefront = async (
  container: MedusaContainer,
  storeProfileId: string,
) => {
  validateProfileId(storeProfileId)
  return await withSafeDatabaseError(async () => {
    const database = databaseFor(container)
    const documents = await database("storefront_document")
      .where({ store_profile_id: storeProfileId })
      .whereNull("deleted_at")
    if (documents.length === 0) return null
    if (documents.length !== 1) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Storefront was not found.",
      )
    }
    if (documents[0].published_revision == null) return null
    const revisions = await database("storefront_document_revision")
      .where({
        storefront_document_id: documents[0].id,
        store_profile_id: storeProfileId,
        revision: documents[0].published_revision,
      })
      .whereNull("deleted_at")
    if (revisions.length !== 1) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Storefront was not found.",
      )
    }
    const parsed = storefrontDocumentV1Schema.safeParse(revisions[0].document)
    if (!parsed.success || !isPublishableDocument(parsed.data)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Storefront was not found.",
      )
    }
    const { schema_version, template_key, ...content } = parsed.data
    return { schema_version, template_key, content }
  })
}

const TEMPLATE_DEFINITIONS = [
  { key: "template-6" as const, label: "Template 6", description: "Turquoise fashion welcome with the shared saved Store workflow. Further page designs are pending." },
  { key: "urbx" as const, label: "URBX", description: "Black and acid-lime streetwear, with a shared saved Store and commerce workflow." },
  { key: "drops" as const, label: "Drops", description: "Sneaker storefront with the shared Store-owned commerce journey." },
  {
    key: "luxe-commerce" as const,
    label: "Luxe Commerce",
    description: "Editorial storefront for premium retail brands.",
  },
  {
    key: "luxe-commerce-full" as const,
    label: "Luxe Commerce — Full Source",
    description:
      "Complete source-faithful premium storefront with the full customer journey.",
  },
  {
    key: "modern-market" as const,
    label: "Modern Market",
    description: "Flexible catalog storefront for general commerce.",
  },
  {
    key: "home-living" as const,
    label: "Home & Living",
    description: "Warm storefront for home and lifestyle catalogs.",
  },
  {
    key: "standard" as const,
    label: "Standard",
    description:
      "Polished responsive storefront for fashion, lifestyle, and general retail.",
  },
  {
    key: "glow-beauty" as const,
    label: "Glow Beauty",
    description:
      "Warm, mobile-first beauty storefront with the complete shared commerce journey.",
  },
]

export const listPlatformStorefrontTemplates = async (
  container: MedusaContainer,
) =>
  await withSafeDatabaseError(async () => {
    const database = databaseFor(container)
    const result = await database.raw(`
      select d.id, d.draft_revision, d.published_revision,
             r.revision, r.template_key
      from storefront_document d
      left join storefront_document_revision r
        on r.storefront_document_id = d.id
       and r.deleted_at is null
       and (r.revision = d.draft_revision or r.revision = d.published_revision)
      where d.deleted_at is null
    `)
    const rows: Record<string, any>[] = result.rows ?? result
    const documents = new Map<
      string,
      {
        draft_revision: number
        published_revision: number | null
        draft_key: string | null
        published_key: string | null
      }
    >()
    for (const row of rows) {
      const current = documents.get(row.id) ?? {
        draft_revision: Number(row.draft_revision),
        published_revision:
          row.published_revision == null
            ? null
            : Number(row.published_revision),
        draft_key: null,
        published_key: null,
      }
      if (Number(row.revision) === current.draft_revision) {
        current.draft_key = row.template_key
      }
      if (
        current.published_revision != null &&
        Number(row.revision) === current.published_revision
      ) {
        current.published_key = row.template_key
      }
      documents.set(row.id, current)
    }
    return {
      templates: TEMPLATE_DEFINITIONS.map((template) => {
        let total = 0
        let published = 0
        let draftOnly = 0
        let unpublishedChanges = 0
        for (const document of documents.values()) {
          const draftMatches = document.draft_key === template.key
          const publishedMatches = document.published_key === template.key
          if (draftMatches || publishedMatches) total += 1
          if (draftMatches) {
            if (document.published_revision == null) draftOnly += 1
            else if (document.draft_revision !== document.published_revision)
              unpublishedChanges += 1
          }
          if (publishedMatches) published += 1
        }
        return {
          ...template,
          status: "active" as const,
          assignments: {
            total,
            published,
            draft_only: draftOnly,
            unpublished_changes: unpublishedChanges,
          },
        }
      }),
    }
  })
