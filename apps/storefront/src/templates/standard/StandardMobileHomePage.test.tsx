import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StandardMobileHomePage from "./StandardMobileHomePage";

describe("Standard mobile storefront home", () => {
  it("renders the selected mobile composition with static preview content", () => {
    const html = renderToStaticMarkup(<StandardMobileHomePage />);

    expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
    expect(html).toContain("Hi, Jani");
    expect(html).toContain("Shop by Categories");
    expect(html).toContain("Swift Dress");
    expect(html).toContain("WEAR YOUR");
    expect(html).toContain("Free delivery on orders over $100");
    expect(html).toContain("New Arrivals");
    expect(html).toContain("Latest Arrivals");
    expect(html).toContain("Trending Now");
    expect(html).toContain("The Neutral Edit");
    expect(html).toContain("Recommended for You");
    expect(html).toContain("Free Delivery");
    expect(html).toContain("Easy Returns");
    expect(html).toContain("Secure Payment");
    expect(html).toContain("Heritage Leather Bag");
    expect(html).toContain("Classic Beige Heels");
    expect(html).toContain("Cat-Eye Sunglasses");
    expect(html).toContain("Tailored Camel Coat");
    expect(html).toContain("Handbags");
    expect(html).toContain("Sunglasses");
    expect(html).toContain("Dresses");
    expect(html).toContain("/assets/standard/hero-editorial.webp");
    expect(html).toContain("/assets/standard/neutral-edit-banner.webp");
    expect(html).toContain("/assets/standard/trending-cat-eye-sunglasses.webp");
    expect(html).toContain("/assets/standard/category-dresses.webp");
    expect(html).toContain("aria-label=\"Desktop storefront navigation\"");
    expect(html).not.toContain("class=\"standard-mobile-nav\"");
  });
});
