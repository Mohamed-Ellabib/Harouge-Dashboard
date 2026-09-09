import { describe, expect, it } from "vitest";
import { initialTemplate6Variant, productGallery, selectProductOption, template6QuantityLimit } from "./template-6-product";
import { template6PreviewProducts } from "./template-6-preview-data";
import type { StorefrontPurchaseOptionsDto } from "../../types";
const variant = (size: string, available = true, color: string | null = null): StorefrontPurchaseOptionsDto["variants"][number] => ({
  id: `${size}-${color}`, title: size, options: { size, color }, unit_price: 295, available_for_sale: available,
});

describe("Template 6 product detail", () => {
  it("keeps the three detail photos independent from the original home thumbnail", () => {
    const product = template6PreviewProducts.find(item => item.handle === "premium-hoodie")!;
    expect(productGallery(product)).toHaveLength(3);
    expect(productGallery(product)[0]).toContain("product-premium-main-v1.webp");
    expect(productGallery(product)).not.toContain(product.thumbnail_url);
    expect(product.description).toContain("crafted for comfort");
  });
  it("never replaces a saved product gallery with template photographs", () => {
    const product = template6PreviewProducts[1];
    expect(productGallery({ ...product, image_urls: ["/custom.jpg", "/custom.jpg"] })).toEqual(["/custom.jpg"]);
    expect(productGallery({ ...product, image_urls: [] })).toEqual([product.thumbnail_url]);
    expect(productGallery({ ...product, image_urls: [], thumbnail_url: null })).toEqual([]);
  });
  it("selects available large by default and never buys unavailable stock", () => {
    expect(initialTemplate6Variant([variant("S"), variant("L")])?.options.size).toBe("L");
    expect(initialTemplate6Variant([variant("S"), variant("L", false)])?.options.size).toBe("S");
    expect(initialTemplate6Variant([])).toBeUndefined();
    expect(initialTemplate6Variant([variant("L", false)])?.available_for_sale).toBe(false);
    const choices = [variant("M", true, "Black"), variant("L", false, "Black"), variant("L", true, "White")];
    expect(selectProductOption(choices, choices[0], "size", "L")).toBeUndefined();
  });
  it("limits added quantities using the existing cart line quantity", () => {
    expect(template6QuantityLimit(0)).toBe(20);
    expect(template6QuantityLimit(1)).toBe(19);
    expect(template6QuantityLimit(19)).toBe(1);
    expect(template6QuantityLimit(20)).toBe(0);
    expect(template6QuantityLimit(25)).toBe(0);
  });
});
