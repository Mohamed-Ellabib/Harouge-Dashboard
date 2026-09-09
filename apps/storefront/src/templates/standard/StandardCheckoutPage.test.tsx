import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StandardCheckoutPage from "./StandardCheckoutPage";

describe("Standard mobile storefront checkout", () => {
  it("renders the reference checkout state, product review, and total", () => {
    const html = renderToStaticMarkup(<StandardCheckoutPage />);

    expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
    expect(html).toContain("Checkout");
    expect(html).toContain("Jani Ahmed");
    expect(html).toContain("Standard Delivery");
    expect(html).toContain("Express Delivery");
    expect(html).toContain("Mastercard");
    expect(html).toContain("Cash on Delivery");
    expect((html.match(/<img/g) ?? [])).toHaveLength(3);
    expect(html).toContain("$373.00");
    expect(html).toContain("$353.00");
    expect(html).toContain("Place Order");
  });
});
