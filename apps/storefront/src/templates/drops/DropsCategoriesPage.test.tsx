import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DropsCategoriesPage } from "./DropsCategoriesPage";

describe("DropsCategoriesPage", () => {
  it("renders the complete mock DROPS categories experience", () => {
    const markup = renderToStaticMarkup(<DropsCategoriesPage />);

    expect(markup).toContain("Categories");
    expect(markup).toContain("Search categories or brands");
    expect(markup).toContain("Find Your Perfect Pair");
    expect(markup).toContain("Shop by style");
    expect(markup).toContain("Running");
    expect(markup).toContain("Lifestyle");
    expect(markup).toContain("Basketball");
    expect(markup).toContain("Skateboarding");
    expect(markup).toContain("Shop for everyone");
    expect(markup).toContain("Popular brands");
    expect(markup).toContain("categories-hero.png");
    expect(markup).toContain("category-running.png");
    expect(markup).toContain("Store navigation");
  });
});
