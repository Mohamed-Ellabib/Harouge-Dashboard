import {
  createProductVariantsWorkflow,
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/core-flows"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import {
  getMerchantStoreContext,
  requireMerchantPermission,
} from "../../../_utils/merchant-store-context"
import {
  assertProductBelongsExclusivelyToVendor,
  listProducts,
  normalizeHandle,
  stringOrNull,
} from "../../../_utils/vendors"

const PRODUCT_STATUSES = ["draft", "published"] as const

type ProductStatus = (typeof PRODUCT_STATUSES)[number]
type VendorProductUpdateBody = {
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

const statusOrNull = (value: unknown): ProductStatus | null =>
  typeof value === "string" && PRODUCT_STATUSES.includes(value as ProductStatus)
    ? (value as ProductStatus)
    : null

const normalizeCurrencyCode = (value: unknown, fallback = "eur"): string => {
  if (typeof value !== "string") {
    return fallback
  }

  const currencyCode = value.trim().toLowerCase()
  return /^[a-z]{3}$/.test(currencyCode) ? currencyCode : fallback
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
  const profiles = await fulfillment.listShippingProfiles({}, { take: 1 })

  if (!profiles[0]?.id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A shipping profile must exist before vendors can publish products."
    )
  }

  return profiles[0].id
}

const getOwnedProduct = async (
  req: MedusaRequest,
  vendorId: string,
  medusaStoreId: string,
  salesChannelId: string,
  productId: string
): Promise<Record<string, any>> => {
  await assertProductBelongsExclusivelyToVendor(
    req,
    vendorId,
    productId,
    medusaStoreId
  )
  const product = (await listProducts(req, { id: [productId] }, 1))[0]
  const channelIds = Array.isArray(product?.sales_channels)
    ? product.sales_channels.map((channel: any) => channel.id)
    : []

  if (!product || channelIds.length !== 1 || channelIds[0] !== salesChannelId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product was not found.")
  }

  return product
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await getMerchantStoreContext(req)
  requireMerchantPermission(context, "products.read")
  const product = await getOwnedProduct(
    req,
    context.vendorId,
    context.medusaStoreId,
    context.allowedSalesChannelId,
    req.params.id
  )

  return res.json({ product })
}

export async function PATCH(
  req: MedusaRequest<VendorProductUpdateBody>,
  res: MedusaResponse
) {
  const context = await getMerchantStoreContext(req)
  requireMerchantPermission(context, "products.write")
  const productId = req.params.id
  const currentProduct = await getOwnedProduct(
    req,
    context.vendorId,
    context.medusaStoreId,
    context.allowedSalesChannelId,
    productId
  )
  const body = req.body ?? {}
  const update: Record<string, unknown> = {
    sales_channels: [{ id: context.allowedSalesChannelId }],
  }
  const primaryVariant = Array.isArray(currentProduct.variants)
    ? currentProduct.variants[0]
    : null
  const primaryPrice = Array.isArray(primaryVariant?.prices)
    ? primaryVariant.prices[0]
    : null

  if ("title" in body) {
    const title = stringOrNull(body.title)
    if (!title) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Product title is required.")
    }
    update.title = title
  }

  if ("handle" in body) {
    const handle = normalizeHandle(body.handle)
    if (!handle) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Product handle is required.")
    }
    update.handle = handle
  }

  if ("status" in body) {
    const status = statusOrNull(body.status)
    if (!status) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Product status is invalid.")
    }
    update.status = status
  }

  if ("thumbnail" in body) {
    update.thumbnail = stringOrNull(body.thumbnail)
  }
  if ("description" in body) {
    update.description = stringOrNull(body.description)
  }

  const variantUpdate: Record<string, unknown> = {}
  const variantRequested =
    "price" in body || "sku" in body || "variant_title" in body

  if ("sku" in body) {
    variantUpdate.sku = stringOrNull(body.sku)
  }
  if ("variant_title" in body) {
    variantUpdate.title =
      stringOrNull(body.variant_title) ?? update.title ?? currentProduct.title ?? "Default"
  }
  if ("price" in body) {
    const price = priceOrNull(body.price)
    if (price === null) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Product price is required.")
    }
    variantUpdate.prices = [
      {
        amount: price,
        currency_code: normalizeCurrencyCode(
          body.currency_code,
          primaryPrice?.currency_code ?? "eur"
        ),
      },
    ]
  }

  if (body.status === "published" || "price" in body) {
    update.shipping_profile_id = await getDefaultShippingProfileId(req)
  }

  const supportedProductChange = [
    "title",
    "handle",
    "status",
    "thumbnail",
    "description",
  ].some((key) => key in body)

  if (!supportedProductChange && !variantRequested) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No supported product fields were provided."
    )
  }

  await updateProductsWorkflow(req.scope).run({
    input: { selector: { id: productId }, update },
  })

  if (variantRequested) {
    if (primaryVariant?.id) {
      await updateProductVariantsWorkflow(req.scope).run({
        input: {
          product_variants: [
            { id: primaryVariant.id, product_id: productId, ...variantUpdate },
          ],
        } as any,
      })
    } else {
      const price = priceOrNull(body.price)
      if (price === null) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Product price is required before creating the first variant."
        )
      }
      await createProductVariantsWorkflow(req.scope).run({
        input: {
          product_variants: [
            {
              product_id: productId,
              title:
                stringOrNull(body.variant_title) ??
                update.title ??
                currentProduct.title ??
                "Default",
              sku: stringOrNull(body.sku),
              manage_inventory: false,
              allow_backorder: true,
              options: { Default: "Default" },
              prices: [
                {
                  amount: price,
                  currency_code: normalizeCurrencyCode(body.currency_code),
                },
              ],
            },
          ],
        } as any,
      })
    }
  }

  const product = await getOwnedProduct(
    req,
    context.vendorId,
    context.medusaStoreId,
    context.allowedSalesChannelId,
    productId
  )
  return res.json({ product })
}
