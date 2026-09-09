import {
  createProductsWorkflow,
  deleteProductsWorkflow,
  createProductCategoriesWorkflow,
} from "@medusajs/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createHash } from "node:crypto"
import { isDeepStrictEqual } from "node:util"
import { z } from "zod"

import {
  listExclusivelyOwnedCanonicalProductIds,
  resolvePermanentStoreByProfileId,
  storeProductLinkDefinition,
} from "./legacy-vendor-compatibility"
import { setMerchantVariantStocks } from "./merchant-product-inventory"
import {
  assertStoreOnlineCheckoutReady,
  resolveStoreShippingProfileId,
} from "./store-commerce-readiness"
import { vendorProductLinkDefinition } from "./vendors"
import {
  readPlatformStorefront,
  type StorefrontDocumentV1,
  updatePlatformStorefrontDraft,
} from "../../modules/saas/platform-storefront-document"

const starterRequestSchema = z
  .object({
    template_key: z.literal("glow-beauty"),
    revision: z.number().int().min(1).max(2_147_483_646),
  })
  .strict()

export type StarterProduct = {
  slug: string
  title: string
  subtitle: string
  description: string
  category: string
  badge: "BEST SELLER" | "NEW" | null
  compareAtPrice: number | null
  thumbnail: string
  images: string[]
  variants: Array<{
    size: string
    color?: string
    amount: number
    stock: number
  }>
}

const GLOW_BEAUTY_STARTER_PRODUCTS: readonly StarterProduct[] = [
  {
    slug: "radiance-serum",
    title: "Radiance Serum",
    subtitle: "Brightening & Glow",
    description:
      "A lightweight illuminating serum that hydrates, brightens and restores a healthy natural glow.",
    category: "Skincare",
    badge: "BEST SELLER",
    compareAtPrice: 160,
    thumbnail: "/assets/glow-beauty/product-radiance-serum.png",
    images: [
      "/assets/glow-beauty/product-radiance-serum-detail.png",
      "/assets/glow-beauty/product-radiance-serum.png",
    ],
    variants: [
      { size: "30 ml", color: "Rose", amount: 125, stock: 36 },
      { size: "30 ml", color: "Pearl", amount: 125, stock: 28 },
      { size: "50 ml", color: "Rose", amount: 165, stock: 24 },
      { size: "50 ml", color: "Pearl", amount: 165, stock: 18 },
      { size: "100 ml", color: "Rose", amount: 255, stock: 12 },
      { size: "100 ml", color: "Pearl", amount: 255, stock: 10 },
    ],
  },
  {
    slug: "hydra-moisturizer",
    title: "Hydra Moisturizer",
    subtitle: "24H Hydration",
    description:
      "Everyday hydration with a soft, comfortable finish for all skin types.",
    category: "Skincare",
    badge: "NEW",
    compareAtPrice: null,
    thumbnail: "/assets/glow-beauty/product-hydra-moisturizer.png",
    images: ["/assets/glow-beauty/product-hydra-moisturizer.png"],
    variants: [
      { size: "50 ml", amount: 98, stock: 42 },
      { size: "100 ml", amount: 155, stock: 20 },
    ],
  },
  {
    slug: "matte-lipstick",
    title: "Matte Lipstick",
    subtitle: "Long Lasting Color",
    description:
      "Rich colour and a smooth matte finish made for comfortable everyday wear.",
    category: "Makeup",
    badge: null,
    compareAtPrice: 95,
    thumbnail: "/assets/glow-beauty/product-matte-lipstick.png",
    images: ["/assets/glow-beauty/product-matte-lipstick.png"],
    variants: [
      { size: "Standard", color: "Rose", amount: 75, stock: 30 },
      { size: "Standard", color: "Nude", amount: 75, stock: 34 },
      { size: "Standard", color: "Berry", amount: 75, stock: 22 },
    ],
  },
  {
    slug: "rose-eau-de-parfum",
    title: "Rose Eau de Parfum",
    subtitle: "Elegant Floral Scent",
    description:
      "An elegant rose-led fragrance with a warm, softly lingering finish.",
    category: "Fragrance",
    badge: null,
    compareAtPrice: null,
    thumbnail: "/assets/glow-beauty/product-rose-eau-de-parfum-wishlist.png",
    images: ["/assets/glow-beauty/product-rose-eau-de-parfum-wishlist.png"],
    variants: [
      { size: "50 ml", amount: 150, stock: 19 },
      { size: "100 ml", amount: 235, stock: 11 },
    ],
  },
  {
    slug: "glow-foundation",
    title: "Glow Foundation",
    subtitle: "Natural Finish",
    description: "Buildable coverage with a natural luminous finish.",
    category: "Makeup",
    badge: null,
    compareAtPrice: null,
    thumbnail: "/assets/glow-beauty/product-glow-foundation.png",
    images: ["/assets/glow-beauty/product-glow-foundation.png"],
    variants: [
      { size: "30 ml", color: "Porcelain", amount: 115, stock: 20 },
      { size: "30 ml", color: "Honey", amount: 115, stock: 26 },
      { size: "30 ml", color: "Caramel", amount: 115, stock: 17 },
    ],
  },
  {
    slug: "luxe-face-cream",
    title: "Luxe Face Cream",
    subtitle: "Deep Nourishment",
    description: "A rich face cream designed to comfort and nourish dry skin.",
    category: "Skincare",
    badge: null,
    compareAtPrice: null,
    thumbnail: "/assets/glow-beauty/product-luxe-face-cream.png",
    images: ["/assets/glow-beauty/product-luxe-face-cream.png"],
    variants: [
      { size: "50 ml", amount: 140, stock: 23 },
      { size: "100 ml", amount: 220, stock: 14 },
    ],
  },
] as const

const conflict = (message: string) =>
  new MedusaError(MedusaError.Types.CONFLICT, message)

export const glowBeautyStarterProducts = () => structuredClone([...GLOW_BEAUTY_STARTER_PRODUCTS])

const starterHandlePrefix = (storeProfileId: string, storeHandle: string) => {
  const readable = storeHandle
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "store"
  const fingerprint = createHash("sha256")
    .update(`glow-beauty:${storeProfileId}`)
    .digest("hex")
    .slice(0, 8)
  return `glow-${readable}-${fingerprint}`
}

const starterHandles = (storeProfileId: string, storeHandle: string, products: readonly StarterProduct[] = GLOW_BEAUTY_STARTER_PRODUCTS) => {
  const prefix = starterHandlePrefix(storeProfileId, storeHandle)
  return new Map(
    products.map((product) => [
      product.slug,
      `${prefix}-${product.slug}`,
    ]),
  )
}

export const glowBeautyStarterDocument = (): StorefrontDocumentV1 => ({
  schema_version: 1,
  template_key: "glow-beauty",
  navigation: {
    items: [
      { key: "home", label: { ar: "الرئيسية", en: "Home" }, enabled: true },
      { key: "categories", label: { ar: "التصنيفات", en: "Categories" }, enabled: true },
      { key: "favorites", label: { ar: "المفضلة", en: "Wishlist" }, enabled: true },
      { key: "cart", label: { ar: "السلة", en: "Bag" }, enabled: true },
      { key: "account", label: { ar: "الحساب", en: "Profile" }, enabled: false },
      { key: "orders", label: { ar: "الطلبات", en: "Orders" }, enabled: false },
      { key: "settings", label: { ar: "الإعدادات", en: "Settings" }, enabled: false },
    ],
  },
  hero: {
    eyebrow: { ar: "وصل حديثاً", en: "New arrivals" },
    heading: { ar: "تألقي بطبيعتك", en: "Glow Naturally, Shine Beautifully" },
    subheading: {
      ar: "اكتشفي مجموعتنا المميزة من أساسيات الجمال لإطلالة مشرقة.",
      en: "Explore our premium beauty collection for a radiant you.",
    },
    cta_label: { ar: "تسوقي الآن", en: "Shop Now" },
    cta_target: "catalog",
    image_url: "/assets/glow-beauty/hero-beauty-collection.png",
    slides: [
      {
        id: "glow-beauty-hero",
        image_url: "/assets/glow-beauty/hero-beauty-collection.png",
        alt: {
          ar: "مجموعة عناية وجمال بدرجات وردية",
          en: "Rose-toned beauty and skincare collection",
        },
        enabled: true,
      },
      {
        id: "glow-beauty-offer",
        image_url: "/assets/glow-beauty/special-offer.png",
        alt: {
          ar: "مجموعة مكياج وأدوات بدرجات دافئة",
          en: "Warm-toned makeup palette and beauty tools",
        },
        enabled: true,
      },
    ],
    buttons: [
      {
        id: "glow-beauty-shop",
        label: { ar: "تسوقي الآن", en: "Shop Now" },
        href: "/products",
        background_color: "#ee5b13",
        text_color: "#ffffff",
        style: "solid",
        enabled: true,
      },
    ],
    benefits: [
      {
        id: "glow-beauty-delivery",
        icon: "truck",
        title: { ar: "توصيل داخل ليبيا", en: "Libya delivery" },
        subtitle: { ar: "التكلفة تظهر عند الدفع", en: "Confirmed at checkout" },
      },
      {
        id: "glow-beauty-payment",
        icon: "shield",
        title: { ar: "طرق دفع محلية", en: "Local payment" },
        subtitle: { ar: "دفع عند الاستلام أو تحويل", en: "COD or bank transfer" },
      },
      {
        id: "glow-beauty-care",
        icon: "sparkle",
        title: { ar: "عناية مختارة", en: "Curated care" },
        subtitle: { ar: "منتجات المتجر", en: "Store-owned products" },
      },
    ],
  },
  brands: {
    heading: { ar: "تسوقي حسب الفئة", en: "Shop by category" },
    subheading: {
      ar: "اكتشفي أساسيات الجمال المختارة",
      en: "Explore curated beauty essentials",
    },
    items: [
      {
        id: "glow-skincare",
        name: { ar: "العناية بالبشرة", en: "Skincare" },
        slug: "skincare",
        image_url: "/assets/glow-beauty/product-radiance-serum.png",
      },
      {
        id: "glow-makeup",
        name: { ar: "المكياج", en: "Makeup" },
        slug: "makeup",
        image_url: "/assets/glow-beauty/product-matte-lipstick.png",
      },
      {
        id: "glow-fragrance",
        name: { ar: "العطور", en: "Fragrance" },
        slug: "fragrance",
        image_url: "/assets/glow-beauty/category-fragrance.png",
      },
      {
        id: "glow-haircare",
        name: { ar: "العناية بالشعر", en: "Haircare" },
        slug: "haircare",
        image_url: "/assets/glow-beauty/category-haircare.png",
      },
      {
        id: "glow-tools",
        name: { ar: "الأدوات", en: "Tools" },
        slug: "tools",
        image_url: "/assets/glow-beauty/category-tools.png",
      },
    ],
  },
  about: {
    title: { ar: "جمالك بطريقتك", en: "Beauty, your way" },
    body: {
      ar: "نختار أساسيات جمال موثوقة للعناية اليومية بثقة.",
      en: "We curate trusted beauty essentials for confident everyday care.",
    },
  },
  contact: {
    heading: { ar: "نحن هنا لمساعدتك", en: "Beauty support" },
    body: {
      ar: "تواصلي معنا للاستفسار عن المنتجات والتوصيل.",
      en: "Contact us with questions about products and delivery.",
    },
  },
  policies: {
    delivery: {
      title: { ar: "سياسة التوصيل", en: "Delivery policy" },
      body: {
        ar: "نوصل الطلبات داخل ليبيا وفق المدة والتكلفة المؤكدتين عند إتمام الطلب.",
        en: "We deliver within Libya using the timing and fee confirmed at checkout.",
      },
    },
    returns: {
      title: { ar: "سياسة الإرجاع", en: "Returns policy" },
      body: {
        ar: "تواصلي معنا مباشرة لطلب الإرجاع وفق شروط المتجر.",
        en: "Contact us directly to request a return under the Store policy.",
      },
    },
    privacy: {
      title: { ar: "سياسة الخصوصية", en: "Privacy policy" },
      body: {
        ar: "نستخدم بيانات الطلب لإتمام الشراء والتواصل بشأنه فقط.",
        en: "We use order details only to complete your purchase and communicate about it.",
      },
    },
    terms: {
      title: { ar: "الشروط والأحكام", en: "Terms & conditions" },
      body: {
        ar: "يخضع استخدام المتجر والطلبات لهذه الشروط المنشورة.",
        en: "Use of this Store and its ordering process is subject to these published terms.",
      },
    },
  },
})

const productRecords = async (
  container: MedusaContainer,
  filters: Record<string, unknown>,
  take: number,
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const { data = [] } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "variants.id",
      "variants.sku",
      "variants.manage_inventory",
    ],
    filters,
    pagination: { skip: 0, take },
  } as any)
  return data as Array<Record<string, any>>
}

const rollbackCreatedProducts = async (
  container: MedusaContainer,
  productIds: string[],
) => {
  if (!productIds.length) return
  await deleteProductsWorkflow(container).run({ input: { ids: productIds } })
}

const createGlowBeautyProducts = async (
  container: MedusaContainer,
  input: {
    storeProfileId: string
    storeHandle: string
    medusaStoreId: string
    salesChannelId: string
    legacyVendorId: string
    stockLocationId: string
    shippingProfileId: string
    products?: StarterProduct[]
    categoryIds?: Record<string, string>
    templateKey?: string
  },
) => {
  const handles = starterHandles(input.storeProfileId, input.storeHandle, input.products)
  const skuPrefix = createHash("sha256")
    .update(`glow-beauty-sku:${input.storeProfileId}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase()
  const stockBySku = new Map<string, number>()
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: (input.products ?? GLOW_BEAUTY_STARTER_PRODUCTS).map((product) => {
        const hasColor = product.variants.some((variant) => variant.color)
        return {
          title: product.title,
          subtitle: product.subtitle,
          description: product.description,
          handle: handles.get(product.slug),
          status: "published",
          thumbnail: product.thumbnail,
          images: product.images.map((url) => ({ url })),
          ...(input.categoryIds?.[product.category] ? { category_ids: [input.categoryIds[product.category]] } : {}),
          metadata: {
            labibtech_template_starter: `${input.templateKey ?? "glow-beauty"}:v1`,
            labibtech_template_product_slug: product.slug,
            labibtech_storefront_category: product.category,
            labibtech_storefront_badge: product.badge,
            labibtech_storefront_compare_at_price_lyd: product.compareAtPrice,
          },
          shipping_profile_id: input.shippingProfileId,
          sales_channels: [{ id: input.salesChannelId }],
          options: [
            {
              title: "Size",
              values: [...new Set(product.variants.map((variant) => variant.size))],
            },
            ...(hasColor
              ? [{
                  title: "Color",
                  values: [
                    ...new Set(
                      product.variants.flatMap((variant) =>
                        variant.color ? [variant.color] : [],
                      ),
                    ),
                  ],
                }]
              : []),
          ],
          variants: product.variants.map((variant, index) => {
            const skuSlug = input.templateKey && input.templateKey !== "glow-beauty" ? product.slug : product.slug.slice(0, 12)
            const sku = `${skuPrefix}-${skuSlug.toUpperCase()}-${index + 1}`
            stockBySku.set(sku, variant.stock)
            return {
              title: [variant.size, variant.color].filter(Boolean).join(" / "),
              sku,
              manage_inventory: true,
              allow_backorder: false,
              options: {
                Size: variant.size,
                ...(variant.color ? { Color: variant.color } : {}),
              },
              prices: [{ amount: variant.amount, currency_code: "lyd" }],
            }
          }),
        }
      }),
    } as any,
  })
  const productIds = result.map((product) => product.id)

  try {
    const link = container.resolve(ContainerRegistrationKeys.LINK) as any
    await link.create(
      productIds.flatMap((productId) => [
        storeProductLinkDefinition(input.medusaStoreId, productId),
        vendorProductLinkDefinition(input.legacyVendorId, productId),
      ]),
    )

    const records = await productRecords(
      container,
      { id: productIds },
      productIds.length,
    )
    const stocks = records.flatMap((product) =>
      Array.isArray(product.variants)
        ? product.variants.map((variant: Record<string, any>) => ({
            variant_id: variant.id,
            stock: stockBySku.get(variant.sku),
          }))
        : [],
    )
    if (
      records.length !== productIds.length ||
      stocks.length !== stockBySku.size ||
      stocks.some(
        (stock) =>
          typeof stock.variant_id !== "string" ||
          typeof stock.stock !== "number",
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "The Glow Beauty starter inventory could not be initialized.",
      )
    }
    await setMerchantVariantStocks(
      container,
      input.stockLocationId,
      stocks as Array<{ variant_id: string; stock: number }>,
    )
    return productIds
  } catch (error) {
    await rollbackCreatedProducts(container, productIds).catch(() => undefined)
    throw error
  }
}

export const installPlatformStorefrontTemplateStarter = async (
  container: MedusaContainer,
  storeProfileId: string,
  body: unknown,
  actorId: string,
) => {
  const request = starterRequestSchema.safeParse(body)
  if (!request.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      request.error.issues[0]?.message ?? "The template starter request is invalid.",
    )
  }

  const binding = await resolvePermanentStoreByProfileId(container, storeProfileId)
  const legacyVendorId = binding.storeProfile.legacy_vendor_id
  if (typeof legacyVendorId !== "string" || !legacyVendorId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The Store compatibility identity is unavailable.",
    )
  }

  const current = await readPlatformStorefront(container, storeProfileId)
  if (current.storefront.revision !== request.data.revision) {
    throw conflict(
      "Storefront content changed in another session. Reload and try again.",
    )
  }

  const handles = starterHandles(storeProfileId, binding.storeProfile.handle)
  const expectedHandles = [...handles.values()].sort()
  const ownedProductIds = await listExclusivelyOwnedCanonicalProductIds(
    container,
    binding.medusaStore.id,
  )
  let createdProductIds: string[] = []
  let catalogStatus: "created" | "already_installed"

  if (ownedProductIds.length) {
    const ownedProducts = await productRecords(
      container,
      { id: ownedProductIds },
      ownedProductIds.length,
    )
    const ownedHandles = ownedProducts
      .map((product) => product.handle)
      .filter((handle): handle is string => typeof handle === "string")
      .sort()
    if (JSON.stringify(ownedHandles) !== JSON.stringify(expectedHandles)) {
      throw conflict(
        "Glow Beauty starter products can only be installed into an empty Store. Existing merchant products were not changed.",
      )
    }
    catalogStatus = "already_installed"
  } else {
    const conflictingHandles = await productRecords(
      container,
      { handle: expectedHandles },
      expectedHandles.length,
    )
    if (conflictingHandles.length) {
      throw conflict("The Glow Beauty starter product handles are unavailable.")
    }

    const readiness = await assertStoreOnlineCheckoutReady(
      container,
      storeProfileId,
      binding.medusaStore.id,
      { validateGraph: true },
    )
    const stockLocationId = readiness.stock_location_id
    if (typeof stockLocationId !== "string" || !stockLocationId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The Store inventory location is unavailable.",
      )
    }
    const shippingProfileId = await resolveStoreShippingProfileId(
      container,
      binding.medusaStore.id,
    )
    createdProductIds = await createGlowBeautyProducts(container, {
      storeProfileId,
      storeHandle: binding.storeProfile.handle,
      medusaStoreId: binding.medusaStore.id,
      salesChannelId: binding.medusaStore.default_sales_channel_id,
      legacyVendorId,
      stockLocationId,
      shippingProfileId,
    })
    catalogStatus = "created"
  }

  const starterDocument = glowBeautyStarterDocument()
  if (
    catalogStatus === "already_installed" &&
    isDeepStrictEqual(current.storefront.document, starterDocument)
  ) {
    return {
      ...current,
      starter: {
        template_key: "glow-beauty" as const,
        catalog_status: catalogStatus,
        product_count: expectedHandles.length,
      },
    }
  }

  try {
    const storefront = await updatePlatformStorefrontDraft(
      container,
      storeProfileId,
      {
        revision: request.data.revision,
        document: starterDocument,
        bank_transfer: current.storefront.bank_transfer,
      },
      actorId,
    )
    return {
      ...storefront,
      starter: {
        template_key: "glow-beauty" as const,
        catalog_status: catalogStatus,
        product_count: expectedHandles.length,
      },
    }
  } catch (error) {
    if (createdProductIds.length) {
      await rollbackCreatedProducts(container, createdProductIds).catch(() => {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "The Glow Beauty starter requires operator attention.",
        )
      })
    }
    throw error
  }
}

export const glowBeautyStarterProductCount =
  GLOW_BEAUTY_STARTER_PRODUCTS.length

// Private creation-draft orchestrator only. Presentation is saved separately so
// confirming a draft cannot reset any of the owner's content edits.
export async function installCreationDraftCatalog(container: MedusaContainer, storeProfileId: string,
  products: StarterProduct[], categories: StorefrontDocumentV1["brands"]["items"], templateKey = "glow-beauty") {
  const binding = await resolvePermanentStoreByProfileId(container, storeProfileId)
  const expected = [...starterHandles(storeProfileId, binding.storeProfile.handle, products).values()].sort()
  const owned = await listExclusivelyOwnedCanonicalProductIds(container, binding.medusaStore.id)
  if (owned.length) {
    const records = await productRecords(container, { id: owned }, owned.length)
    if (JSON.stringify(records.map(p => p.handle).sort()) !== JSON.stringify(expected)) {
      throw conflict("Existing merchant catalog was not changed. Review this Store before continuing.")
    }
    return
  }
  // A welcome-only template has no supplied catalog to install yet.
  if (!products.length && !categories.length) return
  const readiness = await assertStoreOnlineCheckoutReady(container, storeProfileId, binding.medusaStore.id, { validateGraph: true })
  const categoryIds: Record<string, string> = {}
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  for (const category of categories) {
    const handle = `glow-${storeProfileId}-${category.slug}`.toLowerCase()
    const { data } = await query.graph({ entity: "product_category", fields: ["id", "metadata"], filters: { handle } })
    if (data.length) {
      if (data.length !== 1 || data[0].metadata?.store_profile_id !== storeProfileId) throw conflict("Category ownership could not be verified.")
      categoryIds[category.name.en] = data[0].id
    } else {
      const { result } = await createProductCategoriesWorkflow(container).run({ input: { product_categories: [{
        name: category.name.en, handle, is_active: true, is_internal: false,
        metadata: { store_profile_id: storeProfileId, image_url: category.image_url, template_slug: category.slug },
      }] } })
      categoryIds[category.name.en] = result[0].id
    }
  }
  await createGlowBeautyProducts(container, {
    storeProfileId, storeHandle: binding.storeProfile.handle, medusaStoreId: binding.medusaStore.id,
    salesChannelId: binding.medusaStore.default_sales_channel_id, legacyVendorId: binding.storeProfile.legacy_vendor_id!,
    stockLocationId: readiness.stock_location_id!,
    shippingProfileId: await resolveStoreShippingProfileId(container, binding.medusaStore.id), products, categoryIds, templateKey,
  })
}
