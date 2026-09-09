import { describe, expect, it, vi } from "vitest";
import { fetchStorefrontCatalog } from "../../api/storefront-api";
import { getVisualPreviewProfile } from "../../dev/visual-preview";
import { parseStorefrontEditorPreviewProfile } from "../../editor-preview";
import { urbxPreviewProducts } from "./urbx-preview-data";
import { filterUrbxShopProducts, loadUrbxShopCatalog } from "./urbx-shop-catalog";

vi.mock("../../api/storefront-api", async importOriginal => ({ ...await importOriginal<typeof import("../../api/storefront-api")>(), fetchStorefrontCatalog: vi.fn() }));
const defaults = { query: "", category: "", maxPrice: null, sort: "featured" as const };

describe("URBX shop", () => {
  it("filters and sorts the real catalog without changing source records", () => {
    expect(filterUrbxShopProducts(urbxPreviewProducts, { ...defaults, category: "Hoodies" })).toHaveLength(2);
    expect(filterUrbxShopProducts(urbxPreviewProducts, { ...defaults, query: "t shirts" }).map(p => p.handle)).toEqual(["urbx-oversized-tee"]);
    expect(filterUrbxShopProducts(urbxPreviewProducts, { ...defaults, maxPrice: 80, sort: "price-desc" }).map(p => p.price_lyd)).toEqual([79, 49]);
    expect(filterUrbxShopProducts(urbxPreviewProducts, { ...defaults, query: "not-a-product" })).toEqual([]);
    expect(urbxPreviewProducts[0].handle).toBe("urbx-oversized-tee");
  });
  it("does not mistake the first API page for the entire catalog", async () => {
    const fetch = vi.mocked(fetchStorefrontCatalog);
    fetch.mockResolvedValueOnce({ products: urbxPreviewProducts.slice(0, 2), count: 4, offset: 0, limit: 24 });
    fetch.mockResolvedValueOnce({ products: urbxPreviewProducts.slice(2), count: 4, offset: 2, limit: 24 });
    expect(await loadUrbxShopCatalog(new AbortController().signal)).toHaveLength(4);
    expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 2 }));
  });
  it("round-trips shop edits independently and remains compatible with older drafts", () => {
    const profile = getVisualPreviewProfile("?preview=1&template=urbx");
    const home = structuredClone(profile.storefront!.content.home);
    profile.storefront!.content.shop!.statement.en = "YOUR COLLECTION";
    const mapped = parseStorefrontEditorPreviewProfile(profile)!;
    expect(mapped.storefront!.content.shop!.statement.en).toBe("YOUR COLLECTION");
    expect(mapped.storefront!.content.home).toEqual(home);
    profile.storefront!.content.shop!.heading.en = "<script>bad</script>";
    expect(parseStorefrontEditorPreviewProfile(profile)).toBeNull();
    delete profile.storefront!.content.shop;
    expect(parseStorefrontEditorPreviewProfile(profile)).not.toBeNull();
  });
});
