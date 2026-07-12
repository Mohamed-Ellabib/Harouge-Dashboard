import { createProductsWorkflow } from "@medusajs/core-flows"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import {
  getAuthenticatedVendor,
  listProducts,
  listVendorProductLinks,
  normalizeHandle,
  stringOrNull,
  syncVendorProducts,
} from "../../_utils/vendors"

const PRODUCT_STATUSES = ["draft", "published"] as const

type ProductStatus = (typeof PRODUCT_STATUSES)[number]

type VendorProductCreateBody = {
  title?: unknown
  handle?: unknown
  status?: unknown
  thumbnail?: unknown
  description?: unknown
  price?: unknown
  currency_code?: unknown
  sku?: unknown
  variant_title?: unknown
}

const statusOrDefault = (value: unknown): ProductStatus => {
  return typeof value === "string" &&
    PRODUCT_STATUSES.includes(value as ProductStatus)
    ? (value as ProductStatus)
    : "published"
}

const normalizeCurrencyCode = (value: unknown): string => {
  if (typeof value !== "string") {
    return "eur"
  }

  const currencyCode = value.trim().toLowerCase()

  return /^[a-z]{3}$/.test(currencyCode) ? currencyCode : "eur"
}

const priceOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const amount =
    typeof value === "number" ? value : Number(String(value).replace(",", "."))

  if (!Number.isFinite(amount) || amount < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product price must be a valid non-negative number."
    )
  }

  return amount
}

const getDefaultShippingProfileId = async (
  req: MedusaRequest
): Promise<string> => {
  const fulfillment = req.scope.resolve(Modules.FULFILLMENT) as any
  const shippingProfiles = await fulfillment.listShippingProfiles(
    {},
    { take: 1 }
  )
  const shippingProfileId = shippingProfiles[0]?.id

  if (!shippingProfileId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A shipping profile must exist before vendors can create products."
    )
  }

  return shippingProfileId
}

const getDefaultSalesChannels = async (
  req: MedusaRequest
): Promise<{ id: string }[]> => {
  const salesChannel = req.scope.resolve(Modules.SALES_CHANNEL) as any
  const salesChannels = await salesChannel.listSalesChannels({}, { take: 50 })

  if (!salesChannels.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A sales channel must exist before vendors can publish products."
    )
  }

  return salesChannels.map((channel: { id: string }) => ({ id: channel.id }))
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await getAuthenticatedVendor(req)

  if (!context) {
    return res.status(403).json({
      message: "This user is not linked to an active vendor.",
    })
  }

  const links = await listVendorProductLinks(req, {
    vendor_id: context.vendor.id,
  })
  const productIds = links.map((link) => link.product_id)

  if (!productIds.length) {
    return res.json({
      products: [],
      count: 0,
    })
  }

  const products = await listProducts(
    req,
    {
      id: productIds,
    },
    productIds.length
  )

  res.json({
    products,
    count: products.length,
  })
}

export async function POST(
  req: MedusaRequest<VendorProductCreateBody>,
  res: MedusaResponse
) {
  const context = await getAuthenticatedVendor(req)

  if (!context) {
    return res.status(403).json({
      message: "This user is not linked to an active vendor.",
    })
  }

  const body = req.body ?? {}
  const title = stringOrNull(body.title)

  if (!title) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product title is required."
    )
  }

  const handle = normalizeHandle(body.handle) || normalizeHandle(title)
  const price = priceOrNull(body.price)
  const currencyCode = normalizeCurrencyCode(body.currency_code)

  if (!handle) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product handle is required."
    )
  }

  const existingProducts = await listProducts(req, { handle }, 1)

  if (existingProducts.length) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "A product with this handle already exists."
    )
  }

  if (price === null) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product price is required."
    )
  }

  const shippingProfileId = await getDefaultShippingProfileId(req)
  const salesChannels = await getDefaultSalesChannels(req)

  const { result } = await createProductsWorkflow(req.scope).run({
    input: {
      products: [
        {
          title,
          handle,
          status: statusOrDefault(body.status),
          thumbnail: stringOrNull(body.thumbnail),
          description: stringOrNull(body.description),
          shipping_profile_id: shippingProfileId,
          sales_channels: salesChannels,
          options: [
            {
              title: "Default",
              values: ["Default"],
            },
          ],
          variants: [
            {
              title: stringOrNull(body.variant_title) ?? title,
              sku: stringOrNull(body.sku),
              manage_inventory: false,
              allow_backorder: true,
              options: {
                Default: "Default",
              },
              prices: [
                {
                  amount: price,
                  currency_code: currencyCode,
                },
              ],
            },
          ],
        },
      ],
    } as any,
  })
  const productId = result[0].id

  const currentLinks = await listVendorProductLinks(req, {
    vendor_id: context.vendor.id,
  })

  await syncVendorProducts(req, context.vendor.id, [
    ...currentLinks.map((link) => link.product_id),
    productId,
  ])

  const products = await listProducts(req, { id: [productId] }, 1)

  res.status(201).json({
    product: products[0] ?? result[0],
  })
}
