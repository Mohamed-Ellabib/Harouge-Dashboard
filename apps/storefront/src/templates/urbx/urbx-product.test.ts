import { describe, expect, it } from "vitest";
import { initialUrbxVariant, selectUrbxOption, urbxProductImages, type UrbxVariant } from "./urbx-product";
import { urbxPreviewProducts } from "./urbx-preview-data";

const variant = (size: string, color = "Black", available = true): UrbxVariant => ({ id: `${size}-${color}`, title: `${size} / ${color}`, options: { size, color }, unit_price: 89, available_for_sale: available });
describe("URBX product detail", () => {
  it("uses four independent saved gallery photos, not the catalog thumbnail", () => {
    const hoodie = urbxPreviewProducts.find(product => product.handle === "chaos-hoodie")!;
    expect(urbxProductImages(hoodie)).toHaveLength(4);
    expect(urbxProductImages(hoodie)[0]).toContain("detail-chaos-back");
    expect(urbxProductImages(hoodie)).not.toContain(hoodie.thumbnail_url);
  });
  it("respects custom and single-image store products without adding template pictures", () => {
    const hoodie = urbxPreviewProducts[3];
    expect(urbxProductImages({ ...hoodie, image_urls: ["/custom.jpg", "/custom.jpg"] })).toEqual(["/custom.jpg"]);
    expect(urbxProductImages({ ...hoodie, image_urls: [] })).toEqual([hoodie.thumbnail_url]);
    expect(urbxProductImages({ ...hoodie, image_urls: [], thumbnail_url: null })).toEqual([]);
  });
  it("defaults to available medium, then available stock, never a fixture variant", () => {
    expect(initialUrbxVariant([variant("S"), variant("M")])?.id).toBe("M-Black");
    expect(initialUrbxVariant([variant("M", "Black", false), variant("L")])?.id).toBe("L-Black");
    expect(initialUrbxVariant([])).toBeUndefined();
    expect(initialUrbxVariant([variant("M", "Black", false)])?.available_for_sale).toBe(false);
  });
  it("never substitutes another color or an unavailable size on a size click", () => {
    const variants = [variant("M"), variant("L", "Black", false), variant("L", "White")];
    expect(selectUrbxOption(variants, variants[0], "size", "L")).toBeUndefined();
    expect(selectUrbxOption(variants, variants[0], "size", "XXL")).toBeUndefined();
  });
  it("keeps the size on color changes when possible, otherwise chooses available stock in that color", () => {
    const variants = [variant("M"), variant("L", "White"), variant("M", "White")];
    expect(selectUrbxOption(variants, variants[0], "color", "White")?.id).toBe("M-White");
    expect(selectUrbxOption(variants.slice(0, 2), variants[0], "color", "White")?.id).toBe("L-White");
    expect(selectUrbxOption(variants, variants[0], "color", "Red")).toBeUndefined();
  });
});
