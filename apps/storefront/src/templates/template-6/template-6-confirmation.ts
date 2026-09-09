import type { TrackedOrder } from "../../commerce/tracked-orders";
import type { StorefrontOrderConfirmationDto } from "../../types";

export function template6ConfirmationReference(dev: boolean, visual: boolean, editor: boolean, search: string) {
  return dev && visual && !editor && !new URLSearchParams(search).has("setup-preview");
}

// A public display number only selects among already authorized receipts.
export function template6SelectTrackedOrder(orders: TrackedOrder[], receipt: StorefrontOrderConfirmationDto) {
  return orders.find(order => String(order.display_id) === String(receipt.display_id)) ?? null;
}

export function template6Progress(progress?: TrackedOrder["progress"]) {
  switch (progress) {
    case "processing": return { title: "Preparing your order", body: "The store is preparing your items." };
    case "shipped": return { title: "Shipped", body: "The store has marked your order as shipped. Contact the store for delivery details." };
    case "delivered": return { title: "Delivered", body: "The store has marked your order as delivered." };
    default: return { title: "Confirmed", body: "The store has received your order. Fulfillment updates will appear here when available." };
  }
}
