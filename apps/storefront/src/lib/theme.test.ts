import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  deriveStorefrontTheme,
  storefrontThemeCssVariables,
} from "./theme";

describe("storefront brand theme", () => {
  it("derives a text-safe accent while retaining a light decoration color", () => {
    const theme = deriveStorefrontTheme("#ffffff");

    expect(theme.configuredColor).toBe("#ffffff");
    expect(theme.decorationColor).toBe("#ffffff");
    expect(
      contrastRatio(theme.accentColor, theme.onAccentColor),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("uses a safe platform fallback for an invalid brand color", () => {
    const theme = deriveStorefrontTheme("url(javascript:alert(1))");
    const variables = storefrontThemeCssVariables(theme);

    expect(theme.configuredColor).toBeNull();
    expect(theme.decorationColor).toBe("#1455e6");
    expect(contrastRatio(theme.accentColor, "#ffffff")).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(Object.keys(variables).sort()).toEqual([
      "--brand-accent",
      "--brand-accent-hover",
      "--brand-accent-soft",
      "--brand-decoration",
      "--brand-on-accent",
    ]);
  });
});
