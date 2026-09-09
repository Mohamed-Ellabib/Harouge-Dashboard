import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyWishlistPage } from "./GlowBeautyWishlistPage";

describe("Glow Beauty wishlist preview", () => {
  it("renders the supplied saved beauty composition", () => {
    const html = renderToStaticMarkup(<GlowBeautyWishlistPage />);

    expect(html).toContain("My Wishlist");
    expect(html).toContain("6 Saved Items");
    expect(html).toContain("Radiance Serum");
    expect(html).toContain("Rose Eau de Parfum");
    expect(html).toContain("Add All to Bag");
    expect(html).toContain("Recently Added");
  });
});
