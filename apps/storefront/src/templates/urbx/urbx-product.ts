import type { StorefrontProductDetailDto, StorefrontPurchaseOptionsDto } from "../../types";

export type UrbxVariant = StorefrontPurchaseOptionsDto["variants"][number];

// Saved galleries are authoritative. Never append fixture photography to a store's product.
export function urbxProductImages(product: StorefrontProductDetailDto): string[] {
  const images = product.image_urls.filter(Boolean);
  return [...new Set(images.length ? images : product.thumbnail_url ? [product.thumbnail_url] : [])];
}

export function initialUrbxVariant(variants: UrbxVariant[]): UrbxVariant | undefined {
  return variants.find(item => item.available_for_sale && item.options.size === "M")
    ?? variants.find(item => item.available_for_sale) ?? variants[0];
}

export function selectUrbxOption(variants: UrbxVariant[], current: UrbxVariant | undefined, option: "size" | "color", value: string): UrbxVariant | undefined {
  const other = option === "size" ? "color" : "size";
  // A click must never silently add another size/color or an unavailable variant.
  const candidates = variants.filter(item => item.available_for_sale && item.options[option] === value);
  return candidates.find(item => item.options[other] === current?.options[other])
    ?? (option === "color" ? candidates[0] : undefined);
}
