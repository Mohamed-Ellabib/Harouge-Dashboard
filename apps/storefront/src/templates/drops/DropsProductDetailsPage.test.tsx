import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DropsProductDetailsPage } from "./DropsProductDetailsPage";

describe("DropsProductDetailsPage", () => {
  it("renders the complete mock DROPS sneaker-detail experience", () => {
    const markup = renderToStaticMarkup(<DropsProductDetailsPage />);

    expect(markup).toContain("Sneakers Detail");
    expect(markup).toContain("Jordan 1 Low Grey Toe");
    expect(markup).toContain("$14,200");
    expect(markup).toContain("5 Pair Left");
    expect(markup).toContain("69 Reviews");
    expect(markup).toContain("US 4.5");
    expect(markup).toContain("Product Details");
    expect(markup).toContain("Shipping &amp; Returns");
    expect(markup).toContain("Add to Cart");
    expect(markup).toContain("Buy Now");
    expect(markup).toContain("product-green-hero.png");
    expect(markup).toContain("product-green-outsole.png");
  });
});
