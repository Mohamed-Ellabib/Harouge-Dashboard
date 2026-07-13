import {
  createProductVariantsWorkflow,
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/core-flows"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import {
  getAuthenticatedVendor,
  listProducts,
  listVendorProductLinks,
  normalizeHandle,
  resolveVendorSalesChannel,
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

const statusOrNull = (value: unknown): ProductStatus | null => {
  return typeof value === "string" &&
    PRODUCT_STATUSES.includes(value as ProductStatus)
    ? (value as ProductStatus)
    : null
}

const normalizeCurrencyCode = (
  value: unknown,
  fallback = "eur"
): string => {
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
  const shippingProfiles = await fulfillment.listShippingProfiles(
    {},
    { take: 1 }
  )
  const shippingProfileId = shippingProfiles[0]?.id

  if (!shippingProfileId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A shipping profile must exist before vendors can publish products."
    )
  }

  return shippingProfileId
}

const ensureProductBelongsToVendor = async (
  req: MedusaRequest,
  vendorId: string,
  productId: string
) => {
  const links = await listVendorProductLinks(req, {
    vendor_id: vendorId,
    product_id: productId,
  })

  if (!links.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This product is not assigned to your vendor."
    )
  }
}

export async function PATCH(
  req: MedusaRequest<VendorProductUpdateBody>,
  res: MedusaResponse
) {
  const context = await getAuthenticatedVendor(req)

  if (!context) {
    return res.status(403).json({
      message: "This user is not linked to an active vendor.",
    })
  }

  const productId = req.params.id
  await ensureProductBelongsToVendor(req, context.vendor.id, productId)

  const body = req.body ?? {}
  const update: Record<string, unknown> = {}
  const productsBeforeUpdate = await listProducts(req, { id: [productId] }, 1)
  const currentProduct = productsBeforeUpdate[0]
  const primaryVariant = Array.isArray(currentProduct?.variants)
    ? currentProduct.variants[0]
    : null
  const primaryPrice = Array.isArray(primaryVariant?.prices)
    ? primaryVariant.prices[0]
    : null

  if ("title" in body) {
    const title = stringOrNull(body.title)

    if (!title) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product title is required."
      )
    }

    update.title = title
  }

  if ("handle" in body) {
    const handle = normalizeHandle(body.handle)

    if (!handle) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product handle is required."
      )
    }

    update.handle = handle
  }

  if ("status" in body) {
    const status = statusOrNull(body.status)

    if (!status) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product status is invalid."
      )
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
  const isVariantUpdateRequested =
    "price" in body || "sku" in body || "variant_title" in body

  if ("sku" in body) {
    variantUpdate.sku = stringOrNull(body.sku)
  }

  if ("variant_title" in body) {
    variantUpdate.title =
      stringOrNull(body.variant_title) ??
      update.title ??
      currentProduct?.title ??
      "Default"
  }

  if ("price" in body) {
    const price = priceOrNull(body.price)

    if (price === null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product price is required."
      )
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
    update.sales_channels = [
      await resolveVendorSalesChannel(req, context.vendor),
    ]
  }

  if (!Object.keys(update).length && !isVariantUpdateRequested) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No supported product fields were provided."
    )
  }

  if (Object.keys(update).length) {
    await updateProductsWorkflow(req.scope).run({
      input: {
        selector: { id: productId },
        update,
      },
    })
  }

  if (isVariantUpdateRequested) {
    if (primaryVariant?.id) {
      await updateProductVariantsWorkflow(req.scope).run({
        input: {
          product_variants: [
            {
              id: primaryVariant.id,
              product_id: productId,
              ...variantUpdate,
            },
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
                currentProduct?.title ??
                "Default",
              sku: stringOrNull(body.sku),
              manage_inventory: false,
              allow_backorder: true,
              options: {
                Default: "Default",
              },
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

  const products = await listProducts(req, { id: [productId] }, 1)

  res.json({
    product: products[0] ?? currentProduct,
  })
}
