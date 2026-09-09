import { describe, expect, it } from "vitest";
import { getVisualPreviewProfile } from "../../dev/visual-preview";
import { parseStorefrontEditorPreviewProfile } from "../../editor-preview";
import { urbxPreviewProducts } from "./urbx-preview-data";
import { urbxCategoryBanner, urbxCategoryResults, urbxProductInCategory } from "./urbx-categories";

const profile = () => getVisualPreviewProfile("?preview=1&template=urbx");
describe("URBX categories", () => {
  it("counts actual products and searches product names inside categories", () => {
    const categories = profile().storefront!.content.brands.items;
    expect(urbxCategoryResults(categories, urbxPreviewProducts, "").map(item => item.count)).toEqual([2, 1, 1, 0]);
    const cargo = urbxCategoryResults(categories, urbxPreviewProducts, "cargo");
    expect(cargo.map(item => item.category.slug)).toEqual(["bottoms"]);
    expect(cargo[0].productQuery).toBe("cargo");
    expect(urbxCategoryResults(categories, urbxPreviewProducts, "t shirts")[0].productQuery).toBe("");
    expect(urbxCategoryResults(categories, urbxPreviewProducts, "not a product")).toEqual([]);
  });
  it("preserves category membership after display-name edits", () => {
    const hoodie = profile().storefront!.content.brands.items[0];
    hoodie.name = { en: "Heavyweight layers", ar: "Heavyweight layers" };
    expect(urbxPreviewProducts.filter(product => urbxProductInCategory(product, hoodie))).toHaveLength(2);
  });
  it("keeps banner art independent from home tiles and respects owner overrides", () => {
    const hoodie = profile().storefront!.content.brands.items[0];
    expect(urbxCategoryBanner(hoodie)).toBe("/assets/urbx/categories-hoodies-v1.png");
    expect(hoodie.image_url).toBe("/assets/urbx/category-hoodies-v1.png");
    delete hoodie.banner_image_url;
    expect(urbxCategoryBanner(hoodie)).toBe("/assets/urbx/categories-hoodies-v1.png");
    hoodie.image_url = "/assets/custom-hoodie.png";
    expect(urbxCategoryBanner(hoodie)).toBe("/assets/custom-hoodie.png");
    hoodie.banner_image_url = null;
    expect(urbxCategoryBanner(hoodie)).toBeNull();
  });
  it("round-trips category text and images without altering home content", () => {
    const source = profile();
    const home = structuredClone(source.storefront!.content.home);
    source.storefront!.content.brands.explore_label = { en: "Take a look", ar: "Take a look" };
    source.storefront!.content.brands.items[0].banner_image_url = "/assets/edited-category.png";
    const mapped = parseStorefrontEditorPreviewProfile(source)!;
    expect(mapped.storefront!.content.brands.explore_label!.en).toBe("Take a look");
    expect(mapped.storefront!.content.brands.items[0].banner_image_url).toBe("/assets/edited-category.png");
    expect(mapped.storefront!.content.home).toEqual(home);
    source.storefront!.content.brands.explore_label!.en = "<script>bad</script>";
    expect(parseStorefrontEditorPreviewProfile(source)).toBeNull();
    delete source.storefront!.content.brands.explore_label;
    delete source.storefront!.content.brands.items[0].banner_image_url;
    expect(parseStorefrontEditorPreviewProfile(source)).not.toBeNull();
  });
});
