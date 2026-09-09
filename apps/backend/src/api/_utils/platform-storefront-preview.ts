import type { MedusaRequest } from "@medusajs/framework/http"

import { addMerchantInventoryToProducts, resolveStoreStockLocationId } from "./merchant-product-inventory"
import {
  getPermanentBrand,
  listExclusivelyOwnedCanonicalProductIds,
  listPermanentDomains,
  resolvePermanentStoreByProfileId,
} from "./legacy-vendor-compatibility"
import { listProducts } from "./vendors"
import { isAllowedPublicImageUrl } from "../../modules/saas/presentation-validation"

type RecordLike = Record<string, any>

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null

const safeImageUrl = (value: unknown): string | null => {
  const text = stringOrNull(value)
  if (!text) return null

  if (text.startsWith("/") && isAllowedPublicImageUrl(text)) {
    return text
  }

  try {
    const url = new URL(text)
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : null
  } catch {
    return null
  }
}

const safeMetadataText = (
  product: RecordLike,
  key: string,
  maximum: number,
): string | null => {
  const value = stringOrNull(product.metadata?.[key])
  return value && value.length <= maximum && !/[\u0000-\u001f\u007f<>]/u.test(value)
    ? value
    : null
}

const safeMetadataAmount = (product: RecordLike, key: string): number | null => {
  const amount = product.metadata?.[key]
  return typeof amount === "number" && Number.isFinite(amount) && amount >= 0
    ? amount
    : null
}

const productBelongsToChannel = (
  product: RecordLike,
  salesChannelId: string,
): boolean => {
  const channelIds = Array.isArray(product.sales_channels)
    ? product.sales_channels
        .map((channel: RecordLike) => stringOrNull(channel.id))
        .filter(Boolean)
    : []

  return channelIds.length === 1 && channelIds[0] === salesChannelId
}

const productPrice = (product: RecordLike): number | null => {
  const amounts = (Array.isArray(product.variants) ? product.variants : [])
    .flatMap((variant: RecordLike) =>
      Array.isArray(variant.prices) ? variant.prices : [],
    )
    .filter(
      (price: RecordLike) =>
        String(price.currency_code ?? "").toLowerCase() === "lyd" &&
        typeof price.amount === "number" &&
        Number.isFinite(price.amount) &&
        price.amount >= 0,
    )
    .map((price: RecordLike) => price.amount as number)

  return amounts.length ? Math.min(...amounts) : null
}

const productOptions = (product: RecordLike) => {
  const options = new Map<string, Set<string>>()
  for (const variant of Array.isArray(product.variants) ? product.variants : []) {
    for (const option of Array.isArray(variant.options) ? variant.options : []) {
      const title = stringOrNull(option.option?.title)?.toLowerCase()
      const value = stringOrNull(option.value)
      if (!title || !value || !["size", "color"].includes(title)) continue
      const values = options.get(title) ?? new Set<string>()
      values.add(value)
      options.set(title, values)
    }
  }
  return [...options.entries()].map(([name, values]) => ({
    name,
    values: [...values],
  }))
}

const productVariants = (product: RecordLike) =>
  (Array.isArray(product.variants) ? product.variants : []).flatMap(
    (variant: RecordLike, index: number) => {
      const id = stringOrNull(variant.id)
      const handle = stringOrNull(product.handle)
      const amount = (Array.isArray(variant.prices) ? variant.prices : [])
        .find(
          (price: RecordLike) =>
            String(price.currency_code ?? "").toLowerCase() === "lyd" &&
            typeof price.amount === "number" &&
            Number.isFinite(price.amount) &&
            price.amount >= 0,
        )?.amount
      if (!id || !handle || typeof amount !== "number") return []
      const options = Object.fromEntries(
        (Array.isArray(variant.options) ? variant.options : []).flatMap(
          (option: RecordLike) => {
            const title = stringOrNull(option.option?.title)?.toLowerCase()
            const value = stringOrNull(option.value)
            return title && value && ["size", "color"].includes(title)
              ? [[title, value]]
              : []
          },
        ),
      )
      return [{
        id: `editor-preview:${handle}:${index + 1}`,
        title: stringOrNull(variant.title) ?? "Variant",
        options,
        unit_price: amount,
        available_for_sale:
          variant.manage_inventory !== true ||
          variant.allow_backorder === true ||
          Number(variant.available_quantity ?? 0) > 0,
      }]
    },
  )

export const buildPlatformStorefrontPreview = async (
  req: MedusaRequest,
  storeProfileId: string,
): Promise<Record<string, unknown>> => {
  const binding = await resolvePermanentStoreByProfileId(req, storeProfileId)
  const [domains, brand, productIds] = await Promise.all([
    listPermanentDomains(req, storeProfileId),
    getPermanentBrand(req, storeProfileId),
    listExclusivelyOwnedCanonicalProductIds(req, binding.medusaStore.id),
  ])
  const products = productIds.length
    ? await listProducts(req, { id: productIds }, productIds.length)
    : []
  const stockLocationId = await resolveStoreStockLocationId(
    req,
    binding.medusaStore.id,
  )
  const productsWithInventory = await addMerchantInventoryToProducts(
    req,
    products,
    stockLocationId,
  )
  const primaryDomain =
    domains.find((domain) => domain.is_primary) ?? domains[0] ?? null
  const visibleProducts = (productsWithInventory as RecordLike[])
    .filter(
      (product) =>
        product.status === "published" &&
        productBelongsToChannel(
          product,
          binding.medusaStore.default_sales_channel_id,
        ),
    )
    .sort((left, right) =>
      String(left.title ?? "").localeCompare(String(right.title ?? ""), "ar"),
    )
    .slice(0, 24)
    .map((product) => {
      const price = productPrice(product)
      const compareAt = safeMetadataAmount(
        product,
        "labibtech_storefront_compare_at_price_lyd",
      )
      return {
        handle: stringOrNull(product.handle),
        title: stringOrNull(product.title) ?? "منتج",
        subtitle: stringOrNull(product.subtitle),
        description: stringOrNull(product.description),
        thumbnail_url: safeImageUrl(product.thumbnail),
        image_urls: (Array.isArray(product.images) ? product.images : [])
          .map((image: RecordLike) => safeImageUrl(image.url))
          .filter((url): url is string => Boolean(url)),
        category: safeMetadataText(
          product,
          "labibtech_storefront_category",
          80,
        ),
        badge: safeMetadataText(
          product,
          "labibtech_storefront_badge",
          40,
        ),
        price_lyd: price,
        compare_at_price_lyd:
          price !== null && compareAt !== null && compareAt > price
            ? compareAt
            : null,
        options: productOptions(product),
        variants: productVariants(product),
      }
    })

  return {
    storefront: {
      name: binding.medusaStore.name,
      handle: binding.storeProfile.handle,
      domain: stringOrNull(primaryDomain?.normalized_hostname),
      locale: binding.storeProfile.locale,
      contact: {
        public_email: stringOrNull(binding.storeProfile.public_contact_email),
        public_phone: stringOrNull(binding.storeProfile.public_phone),
        whatsapp_number: stringOrNull(binding.storeProfile.whatsapp_number),
      },
      branding: {
        logo_url: safeImageUrl(brand?.logo_url),
        primary_color: stringOrNull(brand?.primary_color),
        secondary_color: stringOrNull(brand?.secondary_color),
        typography_key: stringOrNull(brand?.typography_key),
      },
      products: visibleProducts,
      product_count: visibleProducts.length,
    },
  }
}
