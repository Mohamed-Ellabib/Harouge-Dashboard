import { getOrdersListWorkflow } from "@medusajs/core-flows"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getAuthenticatedVendor,
  listVendorProductLinks,
} from "../../_utils/vendors"

const getItemProductId = (item: Record<string, any>): string | null => {
  return (
    item.product_id ??
    item.variant?.product_id ??
    item.variant?.product?.id ??
    null
  )
}

const getItemTotal = (item: Record<string, any>): number => {
  const explicitTotal = Number(item.total ?? item.subtotal)

  if (Number.isFinite(explicitTotal)) {
    return explicitTotal
  }

  const quantity = Number(item.quantity ?? 0)
  const unitPrice = Number(item.unit_price ?? 0)

  return Number.isFinite(quantity * unitPrice) ? quantity * unitPrice : 0
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
  const productIds = new Set(links.map((link) => link.product_id))

  if (!productIds.size) {
    return res.json({
      orders: [],
      count: 0,
    })
  }

  const { result } = await getOrdersListWorkflow(req.scope).run({
    input: {
      fields: [
        "id",
        "display_id",
        "status",
        "email",
        "currency_code",
        "total",
        "created_at",
        "updated_at",
        "*items",
        "*items.variant",
        "*items.variant.product",
      ],
      variables: {
        filters: {
          is_draft_order: false,
        },
        skip: 0,
        take: 100,
        order: {
          created_at: "DESC",
        },
      },
    },
  })
  const rows = Array.isArray(result) ? result : result.rows

  const orders = rows
    .map((order: Record<string, any>) => {
      const items = Array.isArray(order.items) ? order.items : []
      const vendorItems = items.filter((item: Record<string, any>) => {
        const productId = getItemProductId(item)

        return productId ? productIds.has(productId) : false
      })

      if (!vendorItems.length) {
        return null
      }

      return {
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        email: order.email,
        currency_code: order.currency_code,
        created_at: order.created_at,
        updated_at: order.updated_at,
        vendor_total: vendorItems.reduce(
          (total: number, item: Record<string, any>) => total + getItemTotal(item),
          0
        ),
        items: vendorItems.map((item: Record<string, any>) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: getItemTotal(item),
          product_id: getItemProductId(item),
          variant_title: item.variant?.title ?? null,
        })),
      }
    })
    .filter(Boolean)

  res.json({
    orders,
    count: orders.length,
  })
}
