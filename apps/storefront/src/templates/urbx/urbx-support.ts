import type { TrackedOrder } from "../../commerce/tracked-orders";
import type { StorefrontOrderConfirmationDto, StorefrontProfileDto } from "../../types";

export type SupportOrder = StorefrontOrderConfirmationDto & { progress?: TrackedOrder["progress"] };

/** Keep merchant progress authoritative when the in-memory receipt also exists. */
export function urbxSupportOrders(orders: TrackedOrder[], confirmation: StorefrontOrderConfirmationDto | null): SupportOrder[] {
  const sorted = [...orders].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
  return confirmation && !sorted.some(order => String(order.display_id) === String(confirmation.display_id))
    ? [confirmation, ...sorted] : sorted;
}

export const urbxSupportStatus = (order: SupportOrder) => order.progress
  ? { confirmed: "Confirmed", processing: "Preparing", shipped: "Shipped", delivered: "Delivered" }[order.progress]
  : "Confirmed";

/** Only public contact data belongs in an outbound draft, never a tracking grant. */
export function urbxSupportContacts(contact: StorefrontProfileDto["contact"], orderNumber?: string) {
  const subject = orderNumber ? `Help with order #${orderNumber}` : "Store support";
  const digits = contact.whatsapp_number?.replace(/\D/gu, "") ?? "";
  const phone = contact.public_phone?.replace(/[^+\d]/gu, "") ?? "";
  const email = contact.public_email?.trim() ?? "";
  return {
    whatsapp: /^\d{5,20}$/u.test(digits) ? `https://wa.me/${digits}?text=${encodeURIComponent(subject)}` : null,
    phone: /^\+?\d{5,20}$/u.test(phone) ? `tel:${phone}` : null,
    email: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(email)
      ? `mailto:${email.replace(/[%?#]/gu, char => encodeURIComponent(char))}?subject=${encodeURIComponent(subject)}` : null,
  };
}
