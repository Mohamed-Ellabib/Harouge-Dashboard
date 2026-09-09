import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyCategoriesPage } from "./GlowBeautyCategoriesPage";

describe("GlowBeautyCategoriesPage", () => {
  it("renders the complete mock Glow Beauty category discovery experience", () => {
    const markup = renderToStaticMarkup(<GlowBeautyCategoriesPage />);

    expect(markup).toContain("Explore Categories");
    expect(markup).toContain("Shop by Category");
    expect(markup).toContain("Skincare");
    expect(markup).toContain("Special Offers");
    expect(markup).toContain("Shop by Concern");
    expect(markup).toContain("The Glow Edit");
    expect(markup).toContain("Categories");
  });
});
