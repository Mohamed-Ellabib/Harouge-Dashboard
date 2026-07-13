import { serializeMerchantOrder } from "../merchant-order"

describe("merchant order response contract", () => {
  const sourceOrder = {
    id: "order_1",
    display_id: 42,
    status: "pending",
    email: "customer@example.test",
    currency_code: "eur",
    created_at: "2026-07-13T10:00:00.000Z",
    updated_at: "2026-07-13T11:00:00.000Z",
    shipping_address: { phone: "+000000000" },
    billing_address: { address_1: "private" },
    customer: { id: "customer_internal" },
    metadata: { internal_note: "private" },
    future_private_field: "private",
    items: [
      {
        id: "item_a",
        title: "Store A Product",
        quantity: 2,
        unit_price: 1500,
        total: 3000,
        product_id: "product_a",
        variant: { title: "Default", product_id: "product_a" },
        metadata: { cost: 100 },
      },
      {
        id: "item_b",
        title: "Store B Product",
        quantity: 1,
        unit_price: 2200,
        total: 2200,
        product_id: "product_b",
        variant: { title: "Default", product_id: "product_b" },
      },
    ],
  }

  it("returns an exact allowlist containing only owned line items", () => {
    const result = serializeMerchantOrder(sourceOrder, new Set(["product_a"]))

    expect(result).not.toBeNull()
    expect(Object.keys(result!).sort()).toEqual([
      "created_at",
      "currency_code",
      "display_id",
      "email",
      "id",
      "items",
      "status",
      "updated_at",
      "vendor_total",
    ])
    expect(Object.keys(result!.items[0]).sort()).toEqual([
      "id",
      "product_id",
      "quantity",
      "title",
      "total",
      "unit_price",
      "variant_title",
    ])
    expect(result!.items).toEqual([
      {
        id: "item_a",
        title: "Store A Product",
        quantity: 2,
        unit_price: 1500,
        total: 3000,
        product_id: "product_a",
        variant_title: "Default",
      },
    ])
    expect(result!.vendor_total).toBe(3000)
    expect(JSON.stringify(result)).not.toMatch(
      /shipping_address|billing_address|phone|customer_internal|metadata|future_private_field|product_b/
    )
  })

  it("omits orders that have no line items owned by the merchant", () => {
    expect(serializeMerchantOrder(sourceOrder, new Set(["product_missing"]))).toBeNull()
  })
})
