import { z } from "zod"
import { isAllowedPublicImageUrl } from "../../modules/saas/presentation-validation"
import { storefrontDocumentV1Schema } from "../../modules/saas/platform-storefront-document"
import { platformStoreConfigurationSchema } from "./platform-store-configuration"
import { CREATION_TEMPLATE_KEYS, creationStarterProducts, creationTemplatePreset, type CreationTemplateKey } from "./template-creation-presets"
import { STORE_CATEGORY_KEYS, categoryStarterProducts, categoryCreationPreset } from "./store-creation-catalogs"

const text = (max: number) => z.string().trim().max(max).refine(value => !/[<>\u0000-\u001f\u007f]/u.test(value), "Use plain text.")
const image = z.string().max(2048).refine(isAllowedPublicImageUrl, "Use an uploaded or public HTTPS image.")
export const creationProductSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,80}$/), title: text(160).min(1), subtitle: text(200), description: text(3000),
  category: text(80).min(1), badge: z.enum(["BEST SELLER", "NEW"]).nullable(),
  compareAtPrice: z.number().finite().min(0).max(1_000_000).nullable(),
  thumbnail: image, images: z.array(image).min(1).max(8),
  variants: z.array(z.object({ size: text(60).min(1), color: text(60).min(1).optional(),
    amount: z.number().finite().min(0).max(1_000_000), stock: z.number().int().min(0).max(1_000_000),
  }).strict()).min(1).max(50),
}).strict().superRefine((product, ctx) => {
  const keys = product.variants.map(v => JSON.stringify([v.size, v.color ?? ""]))
  if (new Set(keys).size !== keys.length) ctx.addIssue({ code: "custom", message: "Variant options must be unique." })
  if (product.variants.some(v => v.color) && product.variants.some(v => !v.color)) ctx.addIssue({ code: "custom", message: "All variants must specify color when color is used." })
})

export const creationValuesSchema = z.object({
  starter_catalog: z.enum(STORE_CATEGORY_KEYS).optional(),
  include_starter_products: z.boolean().optional(),
  setup: z.object({
    plan_code: z.enum(["professional_commerce", "starter_whatsapp"]).optional(),
    client_name: text(120).min(2), client_key: z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/), reuse_client: z.boolean(),
    custom_hostname: z.string().max(253).regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i).optional(),
  }).strict().optional(),
  configuration: platformStoreConfigurationSchema,
  // Drafts may contain unfinished identity fields; confirmation validates them
  // before provisioning. Pausing halfway through an email must not lose work.
  owner: z.object({ name: text(120), email: text(254), reuse_existing: z.boolean() }).strict(),
  handle: z.string().regex(/^[a-z0-9-]{0,60}$/),
  delivery_amount: z.number().int().min(0).max(1_000_000),
  document: storefrontDocumentV1Schema.refine(doc => CREATION_TEMPLATE_KEYS.includes(doc.template_key as typeof CREATION_TEMPLATE_KEYS[number]), "Choose a supported creation template."),
  products: z.array(creationProductSchema).max(40),
}).strict().superRefine((values, ctx) => {
  if (values.setup?.plan_code === "starter_whatsapp" && values.products.length) ctx.addIssue({ code: "custom", message: "Starter products require Professional Commerce setup." })
  if (!CREATION_TEMPLATE_KEYS.includes(values.document.template_key as typeof CREATION_TEMPLATE_KEYS[number])) return
  if (!values.starter_catalog && values.include_starter_products !== undefined) ctx.addIssue({ code: "custom", message: "Choose a store category for starter product options." })
  if (!values.starter_catalog && values.document.template_key !== "template-6" && values.products.length === 0) {
    ctx.addIssue({ code: "custom", message: "This template requires its starter products." })
  }
  // Preserve existing welcome-only Template 6 drafts. Never auto-reseed a saved catalog.
  const expected = values.starter_catalog ? (values.include_starter_products === false ? [] : categoryStarterProducts(values.starter_catalog).map(p => p.slug))
    : values.document.template_key === "template-6" && values.products.length === 0 ? []
    : creationStarterProducts(values.document.template_key as typeof CREATION_TEMPLATE_KEYS[number]).map(p => p.slug)
  if (values.products.length !== expected.length || new Set(values.products.map(p => p.slug)).size !== expected.length || values.products.some(p => !expected.includes(p.slug))) {
    ctx.addIssue({ code: "custom", message: "Starter product identities must be preserved." })
  }
  const categories = new Set(values.document.brands.items.map(category => category.name.en))
  if (values.products.some(p => !categories.has(p.category))) ctx.addIssue({ code: "custom", message: "Each product must belong to a saved category." })
})
export type CreationValues = z.infer<typeof creationValuesSchema>

// The library and new drafts share the same validated, freshly allocated values.
export function initialCreationValues(templateKey: CreationTemplateKey, options: {
  starter_catalog?: typeof STORE_CATEGORY_KEYS[number]
  include_starter_products?: boolean
  locale?: "en-LY" | "ar-LY"
} = {}): CreationValues {
  const preset = options.starter_catalog
    ? categoryCreationPreset(templateKey, options.starter_catalog, options.include_starter_products ?? true)
    : creationTemplatePreset(templateKey)
  return creationValuesSchema.parse({
    ...(options.starter_catalog ? { starter_catalog: options.starter_catalog, include_starter_products: options.include_starter_products ?? true } : {}),
    configuration: { name: preset.name, locale: options.locale ?? "en-LY", contact: { public_email: null, public_phone: null, whatsapp_number: null },
      brand: { logo_url: null, primary_color: preset.primary, secondary_color: preset.background, typography_key: "cairo" } },
    owner: { name: "", email: "", reuse_existing: true }, handle: "", delivery_amount: 15,
    document: preset.document, products: preset.products,
  })
}
export const creationSaveSchema = z.object({ revision: z.number().int().positive(), values: creationValuesSchema }).strict()
export const trialAddressSchema = z.object({ email: z.string().email().max(254), first_name: text(80).min(1), last_name: text(80).min(1), address_1: text(200).min(1), city: text(100).min(1), country_code: z.literal("ly"), phone: text(40).min(5) }).strict()
export const trialCommandSchema = z.object({
  action: z.enum(["create", "get", "add", "quantity", "remove", "address", "shipping-options", "shipping", "payment", "complete", "orders"]),
  cart_id: z.string().regex(/^sttrial_[a-f0-9-]{36}$/).optional(),
  variant_id: z.string().max(160).optional(), line_id: z.string().max(160).optional(),
  quantity: z.number().int().min(1).max(20).optional(), address: trialAddressSchema.optional(),
  option_id: z.literal("trial-standard").optional(), payment_method: z.literal("cod").optional(),
}).strict()

export function creationCatalog(values: CreationValues, draftId: string) {
  return values.products.map(product => ({
    handle: product.slug, title: product.title, subtitle: product.subtitle, description: product.description,
    thumbnail_url: product.thumbnail, image_urls: product.images, category: product.category, badge: product.badge,
    price_lyd: Math.min(...product.variants.map(v => v.amount)), compare_at_price_lyd: product.compareAtPrice,
    options: [{ name: "size", values: [...new Set(product.variants.map(v => v.size))] },
      ...(product.variants.some(v => v.color) ? [{ name: "color", values: [...new Set(product.variants.map(v => v.color!))] }] : [])],
    variants: product.variants.map((variant, index) => ({ id: `editor-preview:${draftId}:${product.slug}:${index + 1}`,
      title: [variant.size, variant.color].filter(Boolean).join(" / "),
      options: { size: variant.size, color: variant.color ?? null }, unit_price: variant.amount, available_for_sale: variant.stock > 0,
    })),
  }))
}
