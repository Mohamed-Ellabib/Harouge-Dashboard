import { describe, expect, it } from "vitest";

import type { StorefrontProfileDto } from "../types";
import {
  defaultStorefrontNavigationItems,
  isStorefrontNavigationActive,
  resolvedStorefrontNavigation,
} from "./storefront-navigation";

const profile = {
  locale: "en-LY",
  storefront: {
    template_key: "luxe-commerce-full",
    content: {
      navigation: {
        items: [
          { key: "orders", label: { ar: "طلباتي", en: "My orders" }, enabled: true },
          { key: "home", label: { ar: "البداية", en: "Start" }, enabled: true },
          { key: "cart", label: { ar: "السلة", en: "Cart" }, enabled: false },
        ],
      },
    },
  },
} as StorefrontProfileDto;

describe("storefront navigation", () => {
  it("preserves the saved order, localized labels and visibility", () => {
    expect(resolvedStorefrontNavigation(profile)).toEqual([
      { key: "orders", label: "My orders", to: "/orders" },
      { key: "home", label: "Start", to: "/store" },
    ]);
  });

  it("distinguishes customer account settings from the account page", () => {
    expect(isStorefrontNavigationActive("account", "/account/settings")).toBe(false);
    expect(isStorefrontNavigationActive("settings", "/account/settings")).toBe(true);
  });

  it("keeps configured sections active on full-source template routes", () => {
    expect(isStorefrontNavigationActive("categories", "/watches")).toBe(true);
    expect(isStorefrontNavigationActive("categories", "/brands/fossil")).toBe(true);
    expect(isStorefrontNavigationActive("cart", "/checkout")).toBe(true);
    expect(isStorefrontNavigationActive("orders", "/order-details/1001")).toBe(true);
  });

  it("uses the schema default for legacy documents without navigation", () => {
    const legacyProfile = {
      ...profile,
      storefront: {
        ...profile.storefront,
        content: {},
      },
    } as StorefrontProfileDto;

    expect(resolvedStorefrontNavigation(legacyProfile)).toEqual([
      { key: "home", label: "Main", to: "/store" },
      { key: "categories", label: "Categories", to: "/watches" },
    ]);
    expect(defaultStorefrontNavigationItems()).toHaveLength(7);
  });
});
