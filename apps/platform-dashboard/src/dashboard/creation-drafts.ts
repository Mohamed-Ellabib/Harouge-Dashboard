import { platformRequest } from "./api"
import type { PlatformStoreConfiguration, PlatformStorefrontDocument, PlatformStorefrontPreviewProduct, PlatformStorefrontTemplateKey, ProvisionStoreResult } from "./types"

export const storeCategories = [
  { key: "fashion", label: "Fashion", description: "Clothing, bags and shoes", count: 9 },
  { key: "beauty", label: "Beauty", description: "Skincare, makeup and fragrance", count: 6 },
  { key: "watches-accessories", label: "Watches & Accessories", description: "Watches, sunglasses and pens", count: 10 },
  { key: "home-living", label: "Home & Living", description: "Decor, kitchen and textiles", count: 4 },
  { key: "general-retail", label: "General Retail", description: "A mix of fashion, beauty and home", count: 8 },
] as const
export type StoreCategoryKey = typeof storeCategories[number]["key"]

export type CreationProduct = {
  slug: string; title: string; subtitle: string; description: string; category: string
  badge: "NEW" | "BEST SELLER" | null; compareAtPrice: number | null
  thumbnail: string; images: string[]
  variants: { size: string; color?: string; amount: number; stock: number }[]
}
export type CreationValues = {
  starter_catalog?: StoreCategoryKey
  include_starter_products?: boolean
  setup?: { client_name: string; client_key: string; reuse_client: boolean; custom_hostname?: string; plan_code?: "professional_commerce" | "starter_whatsapp" }
  configuration: PlatformStoreConfiguration
  owner: { name: string; email: string; reuse_existing: boolean }
  handle: string; delivery_amount: number; document: PlatformStorefrontDocument; products: CreationProduct[]
}
export type CreationDraft = {
  confirmation_progress?: { owner_and_store: boolean; commerce: boolean; catalog: boolean; presentation: boolean }
  provisioning?: ProvisionStoreResult | null
  id: string; revision: number; status: "draft" | "confirming" | "confirmed"
  values: CreationValues; store_profile_id: string | null; created_at: string; updated_at: string
}
export type CreationDraftSummary = Pick<CreationDraft, "id" | "revision" | "status" | "store_profile_id" | "updated_at"> & { name: string; owner_name: string }
const root = "/admin/saas/creation-drafts"
const path = (id: string) => `${root}/${encodeURIComponent(id)}`
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) })
export const listCreationDrafts = () => platformRequest<{ drafts: CreationDraftSummary[] }>(root)
export const CREATION_DRAFTS_CHANGED_EVENT = "labibtech:creation-drafts-changed"
export const deleteCreationDraft = async (id: string, revision: number) => {
  const result = await platformRequest<{ id: string; deleted: boolean }>(path(id), { method: "DELETE", body: JSON.stringify({ revision }) })
  window.dispatchEvent(new CustomEvent(CREATION_DRAFTS_CHANGED_EVENT, { detail: { id } }))
  return result
}
export const creationTemplateKeys = ["glow-beauty", "standard", "drops", "luxe-commerce-full", "urbx", "template-6"] as const
export const createCreationDraft = (requestKey: string, templateKey: PlatformStorefrontTemplateKey = "glow-beauty", options?: { starter_catalog?: StoreCategoryKey; include_starter_products?: boolean; locale?: "en-LY" | "ar-LY" }) => platformRequest<{ draft: CreationDraft }>(root, post({ request_key: requestKey, template_key: templateKey, ...options }))
export const readCreationDraft = (id: string) => platformRequest<{ draft: CreationDraft }>(path(id))
export const saveCreationDraft = (id: string, revision: number, values: CreationValues) => platformRequest<{ draft: CreationDraft }>(path(id), post({ revision, values }))
export const confirmCreationDraft = (id: string, revision: number, password?: string) => platformRequest<{ draft: CreationDraft }>(`${path(id)}/confirm`, post({ revision, ...(password ? { initial_password: password } : {}) }))
export const runCreationTrial = async (id: string, command: unknown): Promise<unknown> => (await platformRequest<{ result: unknown }>(`${path(id)}/trial`, post(command))).result

export function draftCatalog(values: CreationValues, id: string): PlatformStorefrontPreviewProduct[] {
  return values.products.map(product => ({
    handle: product.slug, title: product.title, subtitle: product.subtitle, description: product.description,
    thumbnail_url: product.thumbnail, image_urls: product.images, category: product.category, badge: product.badge,
    price_lyd: Math.min(...product.variants.map(v => v.amount)), compare_at_price_lyd: product.compareAtPrice,
    options: [{ name: "size", values: [...new Set(product.variants.map(v => v.size))] },
      ...(product.variants.some(v => v.color) ? [{ name: "color" as const, values: [...new Set(product.variants.map(v => v.color!))] }] : [])],
    variants: product.variants.map((variant, index) => ({ id: `editor-preview:${id}:${product.slug}:${index + 1}`,
      title: [variant.size, variant.color].filter(Boolean).join(" / "), options: { size: variant.size, ...(variant.color ? { color: variant.color } : {}) },
      unit_price: variant.amount, available_for_sale: variant.stock > 0,
    })),
  }))
}
