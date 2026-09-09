import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyCheckoutPage } from "./GlowBeautyCheckoutPage";

describe("GlowBeautyCheckoutPage", () => {
  it("renders the complete mock Glow Beauty checkout experience", () => {
    const markup = renderToStaticMarkup(<GlowBeautyCheckoutPage />);

    expect(markup).toContain("Checkout");
    expect(markup).toContain("Shipping Address");
    expect(markup).toContain("Sophia Carter");
    expect(markup).toContain("Standard Delivery");
    expect(markup).toContain("Visa ending in 4242");
    expect(markup).toContain("Review Your Order");
    expect(markup).toContain("Payment Summary");
    expect(markup).toContain("Place Order");
  });
});
