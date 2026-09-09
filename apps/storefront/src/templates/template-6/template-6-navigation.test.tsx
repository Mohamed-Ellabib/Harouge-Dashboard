import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Template6Navigation, { template6NavigationActive } from "./Template6Navigation";
import { getVisualPreviewProfile } from "../../dev/visual-preview";
import type { ConfiguredStorefrontProfileDto } from "../../types";

describe("Template 6 shared navigation", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([
    ["home", "/", ""], ["home", "/welcome", ""], ["categories", "/", "?category=women"],
    ["categories", "/categories", ""], ["categories", "/products/premium-hoodie", ""],
    ["cart", "/cart", ""], ["cart", "/checkout", ""], ["cart", "/order-confirmation", ""],
    ["account", "/account", ""], ["orders", "/orders", ""], ["favorites", "/favorites", ""],
  ] as const)("selects %s on %s%s", (key, path, search) => {
    expect(template6NavigationActive(key, path, search)).toBe(true);
    expect(template6NavigationActive(key === "home" ? "cart" : "home", path, search)).toBe(false);
  });
  it("renders one shared navigation using merchant order, labels and enabled items", () => {
    vi.stubGlobal("window", { location: { pathname: "/checkout", search: "?setup-preview=1" } });
    const profile = getVisualPreviewProfile("?template=template-6") as ConfiguredStorefrontProfileDto;
    profile.storefront.content.navigation.items = [
      { key: "cart", label: { en: "My bag", ar: "السلة" }, enabled: true },
      { key: "home", label: { en: "Start", ar: "البداية" }, enabled: true },
      { key: "favorites", label: { en: "Saved", ar: "المفضلة" }, enabled: false },
    ];
    const html = renderToStaticMarkup(<Template6Navigation profile={profile} />);
    expect((html.match(/<nav /g) ?? [])).toHaveLength(1);
    expect(html).toContain('aria-label="My bag" aria-current="page"');
    expect(html.indexOf('aria-label="My bag"')).toBeLessThan(html.indexOf('aria-label="Start"'));
    expect(html).not.toContain('aria-label="Nearby"');
    expect(html).not.toContain('aria-label="Saved"');
  });
});
