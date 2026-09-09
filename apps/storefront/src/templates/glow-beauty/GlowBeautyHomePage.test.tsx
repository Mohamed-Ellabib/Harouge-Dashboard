import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyHomePage } from "./GlowBeautyHomePage";

describe("GlowBeautyHomePage", () => {
  it("renders the complete mock beauty storefront without live Store data", () => {
    const markup = renderToStaticMarkup(<GlowBeautyHomePage />);

    expect(markup).toContain("Discover Beauty");
    expect(markup).toContain("Glow Naturally");
    expect(markup).toContain("Best Sellers");
    expect(markup).toContain("Radiance Serum");
    expect(markup).toContain("Hydra Moisturizer");
    expect(markup).toContain("Matte Lipstick");
    expect(markup).toContain("Glow Foundation");
    expect(markup).toContain("Up to 30% Off");
    expect(markup).not.toContain("Store navigation");
  });
});
