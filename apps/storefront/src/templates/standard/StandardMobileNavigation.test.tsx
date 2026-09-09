import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StandardMobileNavigation } from "./StandardMobileNavigation";

describe("Standard mobile storefront navigation", () => {
  it("uses the same five-item anatomy and selected state on every page", () => {
    const home = renderToStaticMarkup(
      <StandardMobileNavigation pathname="/" />,
    );
    const saved = renderToStaticMarkup(
      <StandardMobileNavigation pathname="/favorites" />,
    );

    for (const html of [home, saved]) {
      expect(html).toContain('class="standard-mobile-nav"');
      expect(html).toContain('class="standard-mobile-nav__cart"');
      expect(html).toContain("Home");
      expect(html).toContain("Search");
      expect(html).toContain("Saved");
      expect(html).toContain("Profile");
    }

    expect(home).toContain('aria-current="page"');
    expect(saved).toContain('aria-current="page"');
  });

  it.each([
    ["/", "Home"], ["/store", "Home"], ["/products", "Search"],
    ["/products/ivory-lounge-set", "Search"], ["/favorites", "Saved"],
    ["/cart", "Cart"], ["/checkout", "Cart"], ["/account", "Profile"],
  ])("selects the correct destination at %s", (pathname, label) => {
    const html = renderToStaticMarkup(<StandardMobileNavigation pathname={pathname} />);
    expect(html).toContain(`aria-label="${label}" aria-current="page"`);
    expect((html.match(/<nav /g) ?? [])).toHaveLength(1);
    expect((html.match(/<button /g) ?? [])).toHaveLength(5);
  });
});
