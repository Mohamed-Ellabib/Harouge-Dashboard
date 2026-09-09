import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StandardOrderDetailsPage from "./StandardOrderDetailsPage";

describe("Standard mobile storefront order details", () => {
  it("renders the complete reference order, fulfillment, and payment state", () => {
    const html = renderToStaticMarkup(<StandardOrderDetailsPage />);

    expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
    expect(html).toContain("Order Details");
    expect(html).toContain("#ST-20481");
    expect(html).toContain("Placed on Aug 28, 2026");
    expect(html).toContain("Estimated Delivery");
    expect(html).toContain("Items in Your Order");
    expect((html.match(/<img/g) ?? [])).toHaveLength(3);
    expect(html).toContain("Jani Ahmed");
    expect(html).toContain("Mastercard •••• 4821");
    expect(html).toContain("Total Paid");
    expect(html).toContain("$353.00");
    expect(html).toContain("Contact Support");
    expect(html).toContain("Track Order");
    expect(html).toContain("Download Invoice");
  });
});
