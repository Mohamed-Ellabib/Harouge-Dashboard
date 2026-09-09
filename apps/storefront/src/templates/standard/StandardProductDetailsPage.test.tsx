import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StandardProductDetailsPage from "./StandardProductDetailsPage";

describe("Standard mobile storefront product details", () => {
  it("renders the selected product composition and default options", () => {
    const html = renderToStaticMarkup(<StandardProductDetailsPage />);

    expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
    expect(html).toContain("Product Details");
    expect(html).toContain("Pastel Wrap Dress");
    expect(html).toContain("$129.00");
    expect(html).toContain("(126 Reviews)");
    expect(html).toContain("product-pastel-wrap-dress.webp");
    expect(html).toContain('aria-label="Size M" aria-pressed="true"');
    expect(html).toContain('aria-label="Coral" aria-pressed="true"');
    expect(html).toContain('aria-label="Purchase summary"');
  });
});
