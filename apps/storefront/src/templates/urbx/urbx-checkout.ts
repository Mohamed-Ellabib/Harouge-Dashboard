import type { StorefrontCartDto, StorefrontCheckoutAddress, StorefrontPaymentMethod } from "../../types";

export const emptyUrbxAddress = (country: string): StorefrontCheckoutAddress => ({ email: "", first_name: "", last_name: "", address_1: "", city: "", country_code: country, phone: "" });

export function canPlaceUrbxOrder(cart: StorefrontCartDto | null, preparedCartId: string | null, method: StorefrontPaymentMethod, allowed: StorefrontPaymentMethod[], blocked: boolean): boolean {
  return !blocked && Boolean(cart && cart.id === preparedCartId && cart.items.length > 0 && !cart.completed && cart.shipping_method_selected && allowed.includes(method));
}
