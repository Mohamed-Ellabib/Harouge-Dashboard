import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StandardFavoritesPage from "./StandardFavoritesPage";

describe("Standard mobile storefront favorites", () => {
  it("renders the six-item saved collection and reference controls", () => {
    const html = renderToStaticMarkup(<StandardFavoritesPage />);

    expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
    expect((html.match(/<article/g) ?? [])).toHaveLength(6);
    expect(html).toContain("My Favorites");
    expect(html).toContain("6 saved items");
    expect(html).toContain("Search saved items");
    expect(html).toContain("Pastel Wrap Dress");
    expect(html).toContain("Ivory Lounge Set");
    expect(html).toContain("Heritage Leather Bag");
    expect(html).toContain("Classic Beige Heels");
    expect(html).not.toContain("class=\"standard-mobile-nav\"");
  });
});
