import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Template6HomePage, { filterTemplate6Products } from "./Template6HomePage";
import { FavoritesProvider } from "../../commerce/FavoritesContext";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import { template6PreviewProducts } from "./template-6-preview-data";
import { template6HomeContent } from "./template-6-home-content";
import { getVisualPreviewProfile } from "../../dev/visual-preview";

describe("Template 6 home", () => {
  afterEach(() => vi.unstubAllGlobals());

  const render = (search: string) => {
    vi.stubGlobal("window", { location: { pathname: "/", search } });
    const profile = getVisualPreviewProfile("?template=template-6") as ConfiguredStorefrontProfileDto;
    return renderToStaticMarkup(<FavoritesProvider storeHandle="template-6" previewProducts={[]}><Template6HomePage profile={profile} /></FavoritesProvider>);
  };

  it("renders a focused category shell immediately from a deep link", () => {
    const html = render("?category=women&preview=1&template=template-6");
    expect(html).toContain("template-six-home--category");
    expect(html).toContain("<h1>Women</h1>");
    expect(html).toContain('aria-label="Back to Explore"');
    expect(html).not.toContain('aria-label="Store navigation"');
    expect(html).not.toContain("HEY ARAFAT!");
    expect(html).not.toContain("six-creators");
    expect(html).not.toContain("Clear collection");
  });

  it("keeps the original home shell when no category is selected", () => {
    const html = render("?preview=1&template=template-6");
    expect(html).toContain("HEY ARAFAT!");
    expect(html).toContain("six-creators");
    expect(html).not.toContain('aria-label="Store navigation"');
    expect(html).not.toContain("template-six-home--category");
  });

  it("keeps filters within the selected category, including empty results", () => {
    const women = filterTemplate6Products(template6PreviewProducts, "", "All", "women", null);
    expect(women.map(item => item.handle)).toEqual(["premium-hoodie"]);
    expect(filterTemplate6Products(template6PreviewProducts, "", "Popular", "women", null).every(item => item.category === "Women")).toBe(true);
    expect(filterTemplate6Products(template6PreviewProducts, "", "Offer", "women", null)).toEqual([]);
    expect(filterTemplate6Products(template6PreviewProducts, "", "All", "streetwear", null)).toHaveLength(2);
    expect(filterTemplate6Products(template6PreviewProducts, "", "All", "shoes", null)).toEqual([]);
  });
  it("has its own four products and independent home/welcome content", () => {
    expect(template6PreviewProducts.map(item => item.handle)).toEqual(["hoodie-foreign", "premium-hoodie", "urban-jacket", "everyday-essentials"]);
    expect(template6PreviewProducts.every(item => item.thumbnail_url.startsWith("/assets/template-6/"))).toBe(true);
    const profile = getVisualPreviewProfile("?template=template-6");
    expect(profile.storefront?.content.home?.heading.en).toBe("HEY ARAFAT!");
    expect(template6HomeContent.heading.en).toBe("HEY THERE!");
    expect(profile.storefront?.content.hero.heading.en).toBe("DISCOVER BEST DEALS ITEMS NEARBY");
  });
  it("searches and filters current catalog values without inventing offers", () => {
    expect(filterTemplate6Products(template6PreviewProducts, "jacket", "All", "", null).map(p => p.handle)).toEqual(["urban-jacket"]);
    expect(filterTemplate6Products(template6PreviewProducts, "", "New Arrived", "", null)).toHaveLength(1);
    expect(filterTemplate6Products(template6PreviewProducts, "", "Popular", "", null)).toHaveLength(3);
    expect(filterTemplate6Products(template6PreviewProducts, "", "Offer", "", null)).toEqual([]);
    expect(filterTemplate6Products(template6PreviewProducts, "", "All", "Hoodies", 250)).toEqual([]);
    expect(filterTemplate6Products(template6PreviewProducts, "", "All", "", 200).map(p => p.handle)).toEqual(["everyday-essentials"]);
    expect(filterTemplate6Products([], "", "All", "", null)).toEqual([]);
  });
});
