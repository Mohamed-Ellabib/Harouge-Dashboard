import { getOrdersListWorkflow } from "@medusajs/core-flows"
import type { MedusaRequest } from "@medusajs/framework/http"

import { exclusivelyOwnedIds, listStoreOrderLinks } from "./checkout-ownership-links"

export type MerchantOrderItem = {
  id: string
  title: string
  quantity: number
  unit_price: number | null
  total: number
  product_id: string
  variant_title: string | null
}

export type MerchantOrder = {
  id: string
  display_id: number | string | null
  status: string
  email: string | null
  currency_code: string | null
  created_at: string
  updated_at: string
  vendor_total: number
  items: MerchantOrderItem[]
}

const itemProductId = (item: Record<string, any>): string | null =>
  item.product_id ?? item.variant?.product_id ?? item.variant?.product?.id ?? null

const itemTotal = (item: Record<string, any>): number => {
  const explicit = Number(item.total ?? item.subtotal)
  if (Number.isFinite(explicit)) {
    return explicit
  }

  const calculated = Number(item.quantity ?? 0) * Number(item.unit_price ?? 0)
  return Number.isFinite(calculated) ? calculated : 0
}

export const serializeMerchantOrder = (
  order: Record<string, any>,
  allowedProductIds: ReadonlySet<string>
): MerchantOrder | null => {
  const sourceItems = Array.isArray(order.items) ? order.items : []
  const items = sourceItems.map((item: Record<string, any>) => ({
    item,
    productId: itemProductId(item)
  }))

  if (
    !items.length ||
    items.some((entry) => !entry.productId || !allowedProductIds.has(entry.productId))
  ) {
    return null
  }

  const serializedItems = items.map(({ item, productId }) => ({
    id: String(item.id),
    title: String(item.title ?? ""),
    quantity: Number(item.quantity ?? 0),
    unit_price:
      item.unit_price === null || item.unit_price === undefined ? null : Number(item.unit_price),
    total: itemTotal(item),
    product_id: productId as string,
    variant_title: typeof item.variant?.title === "string" ? item.variant.title : null
  }))

  return {
    id: String(order.id),
    display_id: order.display_id ?? null,
    status: String(order.status ?? "pending"),
    email: typeof order.email === "string" ? order.email : null,
    currency_code: typeof order.currency_code === "string" ? order.currency_code : null,
    created_at: String(order.created_at),
    updated_at: String(order.updated_at),
    vendor_total: serializedItems.reduce((total, item) => total + item.total, 0),
    items: serializedItems
  }
}

export const listMerchantOrders = async (
  req: MedusaRequest,
  medusaStoreId: string,
  allowedProductIds: ReadonlySet<string>,
  orderId?: string
): Promise<MerchantOrder[]> => {
  const links = await listStoreOrderLinks(req, orderId ? { order_id: orderId } : {})
  const ownedOrderIds = exclusivelyOwnedIds(links, "order_id", medusaStoreId)

  if (!ownedOrderIds.length) {
    return []
  }

  const { result } = await getOrdersListWorkflow(req.scope).run({
    input: {
      fields: [
        "id",
        "display_id",
        "status",
        "email",
        "currency_code",
        "created_at",
        "updated_at",
        "*items",
        "*items.variant",
        "*items.variant.product"
      ],
      variables: {
        filters: {
          id: ownedOrderIds,
          is_draft_order: false
        },
        skip: 0,
        take: orderId ? 1 : 100,
        order: { created_at: "DESC" }
      }
    }
  })
  const rows = Array.isArray(result) ? result : result.rows

  return rows
    .map((order: Record<string, any>) => serializeMerchantOrder(order, allowedProductIds))
    .filter((order): order is MerchantOrder => Boolean(order))
}
