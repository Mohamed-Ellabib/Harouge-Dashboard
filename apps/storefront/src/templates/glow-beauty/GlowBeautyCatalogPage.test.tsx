import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlowBeautyCatalogPage } from "./GlowBeautyCatalogPage";

describe("GlowBeautyCatalogPage", () => {
  it("renders the complete mock beauty catalog without live Store data", () => {
    const markup = renderToStaticMarkup(<GlowBeautyCatalogPage />);

    expect(markup).toContain("All Products");
    expect(markup).toContain("128 Products");
    expect(markup).toContain("Summer Glow");
    expect(markup).toContain("Radiance Serum");
    expect(markup).toContain("Rose Eau de Parfum");
    expect(markup).toContain("Luxe Face Cream");
    expect(markup).not.toContain("Store navigation");
  });
});
