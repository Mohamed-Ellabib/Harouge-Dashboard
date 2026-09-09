import { getPlatformStorefront, savePlatformStorefrontDraft } from "./api"
import type { PlatformStorefrontDocument, PlatformStorefrontTemplateKey } from "./types"

export const newStoreTemplateLabels = {
  drops: "Drops",
  "luxe-commerce-full": "Luxe Commerce — Full Source",
  standard: "Standard",
  "glow-beauty": "Glow Beauty",
  urbx: "URBX",
  "template-6": "Template 6",
} as const

export function newStoreTemplateDocument(base: PlatformStorefrontDocument, key: PlatformStorefrontTemplateKey): PlatformStorefrontDocument {
  const document = structuredClone(base)
  document.template_key = key
  if (key !== "glow-beauty") return document
  // Presentation content only. Never copy mock products, prices, orders or policies.
  const asset = (name: string) => `/assets/glow-beauty/${name}.png`
  document.hero = {
    ...document.hero,
    eyebrow: { ar: "وصل حديثاً", en: "New arrivals" },
    heading: { ar: "تألقي بطبيعتك", en: "Glow Naturally, Shine Beautifully" },
    subheading: { ar: "اكتشفي مجموعتنا المميزة من أساسيات الجمال لإطلالة مشرقة.", en: "Explore our premium beauty collection for radiant you." },
    cta_label: { ar: "تسوقي الآن", en: "Shop Now" }, cta_target: "catalog",
    image_url: asset("hero-beauty-collection"),
    slides: [
      { id: "glow-hero", image_url: asset("hero-beauty-collection"), alt: { ar: "مجموعة الجمال", en: "Beauty collection" }, enabled: true },
      { id: "glow-offer", image_url: asset("special-offer"), alt: { ar: "مجموعة مختارة", en: "Selected beauty essentials" }, enabled: true },
    ],
    buttons: [{ id: "glow-shop", label: { ar: "تسوقي الآن", en: "Shop Now" }, href: "/products", background_color: "#f35b05", text_color: "#ffffff", style: "solid", enabled: true }],
  }
  document.brands = { heading: { ar: "تسوقي حسب الفئة", en: "Shop by category" }, subheading: { ar: "اكتشفي مجموعتنا", en: "Explore our collection" }, items: [
    ["skincare", "Skincare", "العناية بالبشرة", "product-radiance-serum"],
    ["makeup", "Makeup", "المكياج", "product-matte-lipstick"],
    ["fragrance", "Fragrance", "العطور", "category-fragrance"],
    ["haircare", "Haircare", "العناية بالشعر", "category-haircare"],
    ["tools", "Tools", "الأدوات", "category-tools"],
  ].map(([slug, en, ar, image]) => ({ id: `glow-${slug}`, slug, name: { en, ar }, image_url: asset(image) })) }
  return document
}

export async function assignNewStoreTemplate(storeId: string, key: PlatformStorefrontTemplateKey) {
  const record = await getPlatformStorefront(storeId)
  if (record.storefront.revision > 1 && record.storefront.document.template_key === key) return
  if (record.storefront.revision !== 1 || record.storefront.published_revision !== null) {
    throw new Error("This store already has template changes. Open its editor to continue without replacing them.")
  }
  await savePlatformStorefrontDraft(storeId, record.storefront.revision,
    newStoreTemplateDocument(record.storefront.document, key), record.storefront.bank_transfer)
}
