import type { StorefrontCartDto, StorefrontProductCardDto } from "../../types";

type CartItem = StorefrontCartDto["items"][number];
const sizes = new Set(["S", "M", "L", "XL", "XXL"]);

export function template6CartVariant(title?: string | null, reference = false, locale: "en-LY" | "ar-LY" = "en-LY"): string | null {
  if (!title || title === "Default variant" || title === "Standard") return null;
  const [size, color] = title.split(" / ");
  const displayColor = color || (reference ? (locale === "ar-LY" ? "أسود" : "Black") : "");
  return sizes.has(size) ? `${displayColor}${displayColor ? " · " : ""}${locale === "ar-LY" ? "المقاس" : "Size"} ${size}` : title;
}

/** Alternate campaign crops are demo-only. Saved Store thumbnails always win. */
export function template6CartPhoto(item: CartItem, reference: boolean): string | null {
  return reference && ["premium-hoodie", "urban-jacket"].includes(item.product_handle ?? "")
    ? `/assets/template-6/cart-${item.product_handle}-v1.webp` : item.thumbnail_url;
}

export function template6CartSummary(cart: StorefrontCartDto, reference: boolean) {
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  // Reference-only estimate; do not write shipping selection or change checkout authority.
  const estimate = reference && !cart.shipping_method_selected && count > 0 ? 20 : 0;
  return { count, subtotal: cart.item_subtotal, delivery: reference || cart.shipping_method_selected ? cart.shipping_total + estimate : null, total: cart.total + estimate };
}

export function template6CartFavorite(item: CartItem): StorefrontProductCardDto | null {
  return item.product_handle ? { handle: item.product_handle, title: item.title, subtitle: null, thumbnail_url: item.thumbnail_url, price_lyd: item.unit_price } : null;
}
