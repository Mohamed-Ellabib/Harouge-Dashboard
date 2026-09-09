import type { StorefrontOrderConfirmationDto } from "../types";

/** Read-only design fixture. Never submits, stores, or completes an order. */
export function urbxConfirmationDesignFixture(): { order: StorefrontOrderConfirmationDto; variants: string[] } {
  return {
    order: {
      display_id: "URBX-10482", currency_code: "lyd",
      items: [
        { title: "No Rules Hoodie", thumbnail_url: "/assets/urbx/no-rules-hoodie-v1.png", quantity: 1, unit_price: 89, total: 89 },
        { title: "X Cargo Pants", thumbnail_url: "/assets/urbx/x-cargo-pants-v1.png", quantity: 1, unit_price: 79, total: 79 },
      ],
      item_subtotal: 168, shipping_total: 0, total: 168,
      payment: { method: "cod", status: "pending_fulfillment" },
    },
    variants: ["Black / Large", "Black / Medium"],
  };
}
