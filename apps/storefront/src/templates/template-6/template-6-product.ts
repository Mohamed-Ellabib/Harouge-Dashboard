import type { StorefrontPurchaseOptionsDto } from "../../types";
import { STOREFRONT_MAX_CART_QUANTITY } from "../../api/storefront-api";
export { urbxProductImages as productGallery, selectUrbxOption as selectProductOption } from "../urbx/urbx-product";

export const template6PremiumGallery = ["main", "side", "fabric"].map(view => `/assets/template-6/product-premium-${view}-v1.webp`);
export const template6PremiumDescription = "Upgrade your wardrobe with our Premium Hoodie, crafted for comfort, style, and everyday wear.";

export function initialTemplate6Variant(variants: StorefrontPurchaseOptionsDto["variants"]) {
  return variants.find(variant => variant.available_for_sale && variant.options.size === "L")
    ?? variants.find(variant => variant.available_for_sale) ?? variants[0];
}

/** This is a cart limit, not an invented stock count; the server still checks stock. */
export function template6QuantityLimit(alreadyInCart: number): number {
  return Math.max(0, STOREFRONT_MAX_CART_QUANTITY - Math.max(0, alreadyInCart));
}
