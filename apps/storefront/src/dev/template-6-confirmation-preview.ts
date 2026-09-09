import type { StorefrontOrderConfirmationDto } from "../types";

/** Read-only artwork reference; never creates an Order or changes a Cart. */
export function template6ConfirmationDesignFixture() {
  return {
    order: {
      display_id: "ORD-10482", currency_code: "lyd",
      items: [
        { title: "Premium Hoodie", variant_title: "L / Black", thumbnail_url: "/assets/template-6/cart-premium-hoodie-v1.webp", quantity: 1, unit_price: 295, total: 295 },
        { title: "Urban Jacket", variant_title: "M / Black", thumbnail_url: "/assets/template-6/cart-urban-jacket-v1.webp", quantity: 1, unit_price: 245, total: 245 },
      ],
      item_subtotal: 540, shipping_total: 20, total: 560,
      // Reference Visa is display-only, not an additional commerce method.
      payment: { method: "cod", status: "pending_fulfillment" },
    } satisfies StorefrontOrderConfirmationDto,
    name: "Arafat", seller: "ZARA Brand Store",
    address: ["Apartment 1204, Marina Heights", "Dubai Marina, Dubai, UAE"],
  };
}
