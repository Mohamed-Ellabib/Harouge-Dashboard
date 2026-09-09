import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { StorefrontProductCardDto } from "../types";
import { FavoritesProvider, useFavorites } from "./FavoritesContext";
import { resolvePreviewFavorites } from "./preview-favorites";

const products: StorefrontProductCardDto[] = Array.from({ length: 5 }, (_, i) => ({ handle: `product-${i}`, title: `Product ${i}`, subtitle: null, thumbnail_url: null }));
function Count() { return <span>{useFavorites().favorites.length}</span>; }

describe("isolated editor wishlist", () => {
  it("starts with four current draft products without touching customer storage", () => {
    const read = vi.fn(() => "[]");
    vi.stubGlobal("window", { localStorage: { getItem: read } });
    try {
      expect(renderToStaticMarkup(<FavoritesProvider storeHandle="urbx" previewProducts={products}><Count /></FavoritesProvider>)).toBe("<span>4</span>");
      expect(read).not.toHaveBeenCalled();
      expect(renderToStaticMarkup(<FavoritesProvider storeHandle="urbx"><Count /></FavoritesProvider>)).toBe("<span>0</span>");
      expect(read).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });
  it("does not refill an emptied preview or invent a missing draft catalog", () => {
    expect(resolvePreviewFavorites(products, [])).toEqual([]);
    expect(renderToStaticMarkup(<FavoritesProvider storeHandle="urbx" previewProducts={[]}><Count /></FavoritesProvider>)).toBe("<span>0</span>");
  });
  it("uses current edits and excludes deleted products while preserving selection order", () => {
    const edited = { ...products[1], title: "Updated hoodie" };
    expect(resolvePreviewFavorites([products[2], edited], [products[1].handle, products[0].handle, products[2].handle])).toEqual([edited, products[2]]);
  });
});
