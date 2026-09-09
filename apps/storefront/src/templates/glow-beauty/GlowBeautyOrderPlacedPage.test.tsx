import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyOrderPlacedPage } from "./GlowBeautyOrderPlacedPage";

describe("GlowBeautyOrderPlacedPage", () => {
  it("renders the complete mock Glow Beauty order confirmation", () => {
    const markup = renderToStaticMarkup(<GlowBeautyOrderPlacedPage />);

    expect(markup).toContain("Order Placed");
    expect(markup).toContain("Thank You, Sophia!");
    expect(markup).toContain("GLW-28462");
    expect(markup).toContain("Delivery Update");
    expect(markup).toContain("Processing");
    expect(markup).toContain("Order Summary");
    expect(markup).toContain("Visa ending in 4242");
    expect(markup).toContain("Track Order");
    expect(markup).toContain("Continue Shopping");
  });
});
