import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StandardOrderConfirmationPage from "./StandardOrderConfirmationPage";

describe("Standard mobile storefront order confirmation", () => {
  it("renders the confirmed reference order and its complete status", () => {
    const html = renderToStaticMarkup(<StandardOrderConfirmationPage />);

    expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
    expect(html).toContain("Order Confirmation");
    expect(html).toContain("Order Placed!");
    expect(html).toContain("#ST-20481");
    expect(html).toContain("Sep 2–4");
    expect((html.match(/<img/g) ?? [])).toHaveLength(3);
    expect(html).toContain("Paid with Mastercard •••• 4821");
    expect(html).toContain("Payment successful");
    expect(html).toContain("Confirmed");
    expect(html).toContain("Delivering to");
    expect(html).toContain("Track Order");
    expect(html).toContain("Continue Shopping");
    expect(html).toContain("View order details");
  });
});
