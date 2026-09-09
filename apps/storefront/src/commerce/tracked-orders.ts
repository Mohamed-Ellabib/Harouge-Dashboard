import { fetchStorefrontTrackedOrder, mapStorefrontOrderConfirmationResponse } from "../api/storefront-api";
import { creationTrialRequest, isCreationTrial } from "../creation-trial";
import type { StorefrontOrderConfirmationDto } from "../types";
import { readOrderGrants } from "./order-history";
export type TrackedOrder = StorefrontOrderConfirmationDto & { progress: "confirmed" | "processing" | "shipped" | "delivered"; created_at: string; updated_at: string };
export async function loadTrackedOrders(handle: string): Promise<TrackedOrder[]> {
  if (isCreationTrial()) {
    const result = await creationTrialRequest({ action: "orders" });
    if (!Array.isArray(result)) throw new Error("Test orders unavailable");
    return result.map(value => ({ ...mapStorefrontOrderConfirmationResponse({ type: "order", order: value }, "lyd"), progress: "confirmed", created_at: String(value.created_at), updated_at: String(value.created_at) }));
  }
  const tokens = readOrderGrants(handle);
  const results = await Promise.allSettled(tokens.map(token => fetchStorefrontTrackedOrder(token)));
  const orders = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  if (tokens.length && !orders.length) throw new Error("Order status is temporarily unavailable. Try again.");
  return orders.filter((order, index) => orders.findIndex(candidate => candidate.display_id === order.display_id) === index);
}
