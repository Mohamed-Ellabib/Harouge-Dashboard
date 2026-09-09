import type { TrackedOrder } from "../commerce/tracked-orders";
import { urbxConfirmationDesignFixture } from "./urbx-confirmation-preview";

/** Presentation-only. No address, status or delivery promise from this fixture enters live commerce. */
export function urbxOrderDetailsDesignFixture(): TrackedOrder {
  const { order, variants } = urbxConfirmationDesignFixture();
  return {
    ...order,
    items: order.items.map((item, index) => ({ ...item, variant_title: variants[index] })),
    progress: "confirmed", created_at: "2026-09-05T12:00:00Z", updated_at: "2026-09-05T12:00:00Z",
  };
}

export const urbxOrderDesignAddress = ["Alex Morgan", "24 Market Street, Apartment 3", "Tripoli, Libya", "alex@example.com"];
