import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StandardCartPage from "./StandardCartPage";

describe("Standard mobile storefront cart", () => {
  it("renders the three-item reference cart and exact initial totals", () => {
    const html = renderToStaticMarkup(<StandardCartPage />);

    expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
    expect(html).toContain("My Cart");
    expect(html).toContain("3 items");
    expect(html).toContain("Pastel Wrap Dress");
    expect(html).toContain("Heritage Leather Bag");
    expect(html).toContain("Classic Beige Heels");
    expect(html).toContain("$373.00");
    expect(html).toContain("$353.00");
    expect(html).toContain("Proceed to Checkout");
  });
});
