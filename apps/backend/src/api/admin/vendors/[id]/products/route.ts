import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getMarketplaceService,
  listProducts,
  listVendorProductLinks,
  syncVendorProducts,
} from "../../../../_utils/vendors"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = getMarketplaceService(req)
  const { id } = req.params

  const vendor = await marketplace.retrieveVendor(id).catch(() => null)

  if (!vendor) {
    return res.status(404).json({
      message: "Vendor was not found.",
    })
  }

  const [products, links] = await Promise.all([
    listProducts(req),
    listVendorProductLinks(req, { vendor_id: id }),
  ])
  const assignedProductIds = new Set(links.map((link) => link.product_id))

  res.json({
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      thumbnail: product.thumbnail,
      assigned: assignedProductIds.has(product.id),
    })),
    assigned_product_ids: [...assignedProductIds],
  })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = getMarketplaceService(req)
  const { id } = req.params
  const productIds = Array.isArray((req.body as any)?.product_ids)
    ? (req.body as any).product_ids.filter(
        (productId: unknown): productId is string => typeof productId === "string"
      )
    : []

  const vendor = await marketplace.retrieveVendor(id).catch(() => null)

  if (!vendor) {
    return res.status(404).json({
      message: "Vendor was not found.",
    })
  }

  await syncVendorProducts(req, id, productIds)

  const links = await listVendorProductLinks(req, { vendor_id: id })

  res.json({
    assigned_product_ids: links.map((link) => link.product_id),
  })
}
