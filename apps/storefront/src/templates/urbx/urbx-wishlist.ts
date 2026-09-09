import type { StorefrontPurchaseOptionsDto } from "../../types";

type Variant = StorefrontPurchaseOptionsDto["variants"][number];

export function initialUrbxWishlistVariant(variants: Variant[], preferredSize = "M") {
  return variants.find(variant => variant.available_for_sale && variant.options.size === preferredSize)
    ?? variants.find(variant => variant.available_for_sale)
    ?? variants[0];
}

export function urbxWishlistVariantLabel(variant: Variant, multipleColors: boolean) {
  const size = variant.options.size ? `Size: ${variant.options.size}` : "";
  const color = multipleColors ? variant.options.color : "";
  return [size, color].filter(Boolean).join(" / ") || variant.title;
}

// A failed cart request must leave the saved item intact.
export async function moveUrbxWishlistItem(variantId: string, add: (id: string) => Promise<void>, remove: () => void) {
  await add(variantId);
  remove();
}
