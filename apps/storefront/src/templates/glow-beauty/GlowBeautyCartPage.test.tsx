import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyCartPage } from "./GlowBeautyCartPage";

describe("GlowBeautyCartPage", () => {
  it("renders the complete mock Glow Beauty bag experience", () => {
    const markup = renderToStaticMarkup(<GlowBeautyCartPage />);

    expect(markup).toContain("My Bag");
    expect(markup).toContain("You’ve unlocked free delivery");
    expect(markup).toContain("Radiance Serum");
    expect(markup).toContain("Matte Lipstick");
    expect(markup).toContain("Hydra Moisturizer");
    expect(markup).toContain("Standard Delivery");
    expect(markup).toContain("Order Summary");
    expect(markup).toContain("Proceed to Checkout");
  });
});
