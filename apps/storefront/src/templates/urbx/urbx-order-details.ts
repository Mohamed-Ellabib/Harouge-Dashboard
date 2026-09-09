import type { TrackedOrder } from "../../commerce/tracked-orders";
import type { StorefrontOrderConfirmationDto } from "../../types";

export type UrbxOrderReceipt = StorefrontOrderConfirmationDto & Partial<Pick<TrackedOrder, "progress" | "created_at">>;

export const urbxOrderDetailsPath = (displayId: string | number) => `/order-details/${encodeURIComponent(String(displayId))}`;

/** A public display number selects only orders already authorized by this browser's grants. */
export function selectUrbxOrder(orders: TrackedOrder[], confirmation: StorefrontOrderConfirmationDto | null, displayId: string | null): UrbxOrderReceipt | null {
  const sorted = [...orders].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
  if (displayId !== null) return sorted.find(order => String(order.display_id) === displayId)
    ?? (confirmation && String(confirmation.display_id) === displayId ? confirmation : null);
  return (confirmation ? sorted.find(order => String(order.display_id) === String(confirmation.display_id)) ?? confirmation : sorted[0]) ?? null;
}

export const urbxOrderProgress = (progress: UrbxOrderReceipt["progress"]) => ({
  confirmed: { label: "Confirmed", step: 0, description: "We’ve received your order." },
  processing: { label: "Preparing", step: 1, description: "The store is preparing your order." },
  shipped: { label: "Shipped", step: 2, description: "Your order has been marked as shipped." },
  delivered: { label: "Delivered", step: 3, description: "Your order has been marked as delivered." },
}[progress ?? "confirmed"]);

export function urbxOrderDate(createdAt?: string): string | null {
  if (!createdAt || !Number.isFinite(Date.parse(createdAt))) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Tripoli" }).format(new Date(createdAt)).replace(/\bSept\b/u, "Sep");
}
