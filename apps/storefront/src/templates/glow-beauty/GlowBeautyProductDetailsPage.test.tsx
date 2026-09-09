import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyProductDetailsPage } from "./GlowBeautyProductDetailsPage";

describe("GlowBeautyProductDetailsPage", () => {
  it("renders the complete mock Radiance Serum purchase experience", () => {
    const markup = renderToStaticMarkup(<GlowBeautyProductDetailsPage />);

    expect(markup).toContain("Product Details");
    expect(markup).toContain("Radiance Serum");
    expect(markup).toContain("Choose Size");
    expect(markup).toContain("Customer Reviews");
    expect(markup).toContain("Add to Bag");
    expect(markup).toContain("product-radiance-serum-detail.png");
  });
});
