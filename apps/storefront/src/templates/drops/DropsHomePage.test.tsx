import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DropsHomePage } from "./DropsHomePage";

describe("DropsHomePage", () => {
  it("renders the complete mock sneaker storefront without live Store data", () => {
    const markup = renderToStaticMarkup(<DropsHomePage />);

    expect(markup).toContain("DROPS");
    expect(markup).toContain("Jl. Malioboro, Blok Z, no 18");
    expect(markup).toContain("Year-End Sale");
    expect(markup).toContain("New Arrival");
    expect(markup).toContain("Jordan 1 Retro High Dior");
    expect(markup).toContain("Adidas Iniki Runner 70S");
    expect(markup).toContain("Store navigation");
  });
});
