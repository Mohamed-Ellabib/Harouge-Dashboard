import { getOrdersListWorkflow } from "@medusajs/core-flows"
import type { MedusaRequest } from "@medusajs/framework/http"

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
  const items = (Array.isArray(order.items) ? order.items : [])
    .map((item: Record<string, any>) => ({ item, productId: itemProductId(item) }))
    .filter(
      (entry): entry is { item: Record<string, any>; productId: string } =>
        Boolean(entry.productId && allowedProductIds.has(entry.productId))
    )

  if (!items.length) {
    return null
  }

  const serializedItems = items.map(({ item, productId }) => ({
    id: String(item.id),
    title: String(item.title ?? ""),
    quantity: Number(item.quantity ?? 0),
    unit_price:
      item.unit_price === null || item.unit_price === undefined
        ? null
        : Number(item.unit_price),
    total: itemTotal(item),
    product_id: productId,
    variant_title:
      typeof item.variant?.title === "string" ? item.variant.title : null,
  }))

  return {
    id: String(order.id),
    display_id: order.display_id ?? null,
    status: String(order.status ?? "pending"),
    email: typeof order.email === "string" ? order.email : null,
    currency_code:
      typeof order.currency_code === "string" ? order.currency_code : null,
    created_at: String(order.created_at),
    updated_at: String(order.updated_at),
    vendor_total: serializedItems.reduce((total, item) => total + item.total, 0),
    items: serializedItems,
  }
}

export const listMerchantOrders = async (
  req: MedusaRequest,
  allowedProductIds: ReadonlySet<string>,
  orderId?: string
): Promise<MerchantOrder[]> => {
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
        "*items.variant.product",
      ],
      variables: {
        filters: {
          is_draft_order: false,
          ...(orderId ? { id: orderId } : {}),
        },
        skip: 0,
        take: orderId ? 1 : 100,
        order: { created_at: "DESC" },
      },
    },
  })
  const rows = Array.isArray(result) ? result : result.rows

  return rows
    .map((order: Record<string, any>) =>
      serializeMerchantOrder(order, allowedProductIds)
    )
    .filter((order): order is MerchantOrder => Boolean(order))
}
