import { describe, expect, it } from "vitest";
import { getVisualPreviewProfile } from "../../dev/visual-preview";
import { parseStorefrontEditorPreviewProfile } from "../../editor-preview";
import { resolvedStorefrontNavigation } from "../../lib/storefront-navigation";
import { filterTemplate6Products } from "./Template6HomePage";
import { template6CategoryHref, template6CategoryPhoto, template6ExploreBrands, template6ExploreResults } from "./template-6-explore";
import { template6PreviewProducts } from "./template-6-preview-data";

describe("Template 6 Explore", () => {
  const profile = getVisualPreviewProfile("?template=template-6");
  const content = profile.storefront!.content;
  const categories = content.brands.items;
  it("has six independent banner assets and keeps the home images separate", () => {
    expect(categories.map(c => c.slug)).toEqual(["men", "women", "shoes", "bags", "accessories", "streetwear"]);
    expect(categories.every(c => c.banner_image_url?.includes(`/explore-${c.slug}-`) && c.image_url?.includes("creator-"))).toBe(true);
    expect(content.brands.promotion_image_url).not.toBe(content.home?.promotion_image_url);
    expect(resolvedStorefrontNavigation(profile).find(i => i.key === "categories")?.to).toBe("/categories");
  });
  it("searches the complete supplied catalog and counts only actual memberships", () => {
    const results = template6ExploreResults(categories, template6PreviewProducts, "", false, false);
    expect(results.map(r => r.count)).toEqual([1, 1, 0, 0, 0, 2]);
    expect(template6ExploreResults(categories, template6PreviewProducts, "jacket", false, false).map(r => r.category.slug)).toEqual(["men"]);
    expect(template6ExploreResults(categories, template6PreviewProducts, "", true, true).map(r => r.category.slug)).toEqual(["men", "streetwear", "women"]);
    expect(template6ExploreResults(categories, [], "", true, false)).toEqual([]);
  });
  it("preserves custom images, explicit removal, empty catalogs and renamed category membership", () => {
    expect(template6CategoryPhoto({ ...categories[0], banner_image_url: null })).toBeNull();
    expect(template6CategoryPhoto({ ...categories[0], banner_image_url: undefined, image_url: "/custom.webp" })).toBe("/custom.webp");
    const renamed = { ...categories[0], name: { en: "Tailoring", ar: "Tailoring" } };
    expect(template6ExploreResults([renamed], template6PreviewProducts, "Tailoring", false, false)[0].count).toBe(1);
    expect(template6CategoryHref(renamed, "a&b")).toBe("/?category=men&q=a%26b");
    expect(filterTemplate6Products(template6PreviewProducts, "", "All", renamed.slug, null, [renamed.name.en]).map(p => p.handle)).toEqual(["urban-jacket"]);
    expect(filterTemplate6Products(template6PreviewProducts, "", "All", "shoes", null)).toEqual([]);
  });
  it("derives brands from real product metadata only", () => {
    expect(template6ExploreBrands(template6PreviewProducts, "template")).toMatchObject([{ name: "Template 6", count: 4 }]);
    expect(template6ExploreBrands([], "")).toEqual([]);
    expect(template6ExploreBrands(template6PreviewProducts, "nonexistent")).toEqual([]);
  });
  it("round trips optional promotion copy through the strict preview parser", () => {
    // The standalone art fixture intentionally has blank unrendered sections.
    // Use complete published copy for the canonical parser contract.
    const complete = getVisualPreviewProfile("?template=luxe-commerce-full&locale=en-LY");
    complete.storefront!.template_key = "template-6";
    complete.storefront!.content.brands = structuredClone(content.brands);
    const parsed = parseStorefrontEditorPreviewProfile(complete);
    expect(parsed?.storefront?.content.brands).toMatchObject({ promotion_heading: { en: "FRESH FINDS" }, promotion_subheading: { en: "Explore the latest arrivals" }, promotion_image_url: content.brands.promotion_image_url });
    const invalid = structuredClone(complete);
    invalid.storefront!.content.brands.promotion_image_url = "javascript:alert(1)";
    expect(parseStorefrontEditorPreviewProfile(invalid)).toBeNull();
  });
});
