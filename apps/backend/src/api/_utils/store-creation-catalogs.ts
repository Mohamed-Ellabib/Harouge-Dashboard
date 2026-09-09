import { creationStarterProducts, creationTemplatePreset, type CreationTemplateKey } from "./template-creation-presets"
import type { StarterProduct } from "./platform-storefront-template-starter"

export const STORE_CATEGORY_KEYS = ["fashion", "beauty", "watches-accessories", "home-living", "general-retail"] as const
export type StoreCategoryKey = typeof STORE_CATEGORY_KEYS[number]

// Installation sources only. Every confirmed store owns its own copies.
export function categoryStarterProducts(category: StoreCategoryKey): StarterProduct[] {
  if (category === "fashion") return creationStarterProducts("standard")
  if (category === "beauty") return creationStarterProducts("glow-beauty")
  if (category === "watches-accessories") return creationStarterProducts("luxe-commerce-full")
  const home: StarterProduct[] = [
    ["ceramic-vase", "Ceramic Vase", "Decor", "vase", 85],
    ["ceramic-mug", "Ceramic Mug", "Kitchen", "mug", 35],
    ["woven-cushion", "Woven Cushion", "Textiles", "cushion", 65],
    ["scented-candle", "Scented Candle", "Decor", "candle", 45],
  ].map(([slug, title, category, image, amount]) => ({
    slug: String(slug), title: String(title), category: String(category), subtitle: String(category),
    description: `${title}. Sample product for store setup; edit or replace before publishing.`,
    thumbnail: `/assets/preview/${image}.png`, images: [`/assets/preview/${image}.png`],
    badge: null, compareAtPrice: null, variants: [{ size: "Standard", amount: Number(amount), stock: 20 }],
  }))
  if (category === "home-living") return home
  return [
    ...creationStarterProducts("standard").slice(0, 2),
    ...creationStarterProducts("glow-beauty").slice(0, 2),
    ...creationStarterProducts("luxe-commerce-full").slice(0, 2),
    ...home.slice(0, 2),
  ]
}

export function categoryCreationPreset(template: CreationTemplateKey, category: StoreCategoryKey, includeProducts: boolean) {
  const preset = creationTemplatePreset(template)
  const products = includeProducts ? categoryStarterProducts(category) : []
  const categoryNames = [...new Set(products.map(product => product.category))]
  const translations: Record<string, string> = { Decor: "ديكور", Kitchen: "المطبخ", Textiles: "المنسوجات", Watches: "الساعات", Sunglasses: "النظارات الشمسية", Pens: "الأقلام", Casual: "ملابس يومية", Dresses: "فساتين", Handbags: "حقائب", Shoes: "أحذية", Skincare: "العناية بالبشرة", Makeup: "المكياج", Fragrance: "العطور", Haircare: "العناية بالشعر" }
  preset.document.brands.items = categoryNames.map((name, index) => {
    const matching = products.find(product => product.category === name)!
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `category-${index + 1}`
    return { id: `starter-${slug}`, slug, name: { en: name, ar: translations[name] ?? name }, image_url: matching.thumbnail, banner_image_url: matching.thumbnail }
  })
  // Preserve the chosen layout and hero artwork; category navigation follows its catalog.
  return { ...preset, products }
}
