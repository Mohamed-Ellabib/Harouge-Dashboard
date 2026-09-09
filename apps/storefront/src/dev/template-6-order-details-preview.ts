import type { TrackedOrder } from "../commerce/tracked-orders";
import { template6ConfirmationDesignFixture } from "./template-6-confirmation-preview";

/** Read-only samples for the existing preview history; never customer receipts. */
export function template6OrderDetailsDesignFixture() {
  const design = template6ConfirmationDesignFixture();
  const orders: TrackedOrder[] = [
    { ...design.order, progress: "confirmed", created_at: "2026-09-05T09:00:00Z", updated_at: "2026-09-05T09:00:00Z" },
    { ...design.order, display_id: "ORD-10415", items: [design.order.items[0]], item_subtotal: 295, total: 315, progress: "shipped", created_at: "2026-09-03T09:00:00Z", updated_at: "2026-09-05T09:00:00Z" },
    { ...design.order, display_id: "ORD-10398", items: [design.order.items[1]], item_subtotal: 245, total: 265, progress: "delivered", created_at: "2026-09-01T09:00:00Z", updated_at: "2026-09-04T09:00:00Z" },
  ];
  return { ...design, orders, phone: "+971 5X XXX 4821" };
}
