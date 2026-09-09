import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  deriveStorefrontTheme,
  storefrontThemeCssVariables,
  storefrontTypographyCssVariables,
} from "./theme";

describe("storefront brand theme", () => {
  it("derives a text-safe accent while retaining a light decoration color", () => {
    const theme = deriveStorefrontTheme("#ffffff", "#f2b134");

    expect(theme.configuredColor).toBe("#ffffff");
    expect(theme.decorationColor).toBe("#ffffff");
    expect(theme.secondaryDecorationColor).toBe("#f2b134");
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
      "--brand-secondary-decoration",
      "--brand-secondary-decoration-soft",
    ]);
  });

  it("keeps the secondary color decorative and never uses it as the text accent", () => {
    const theme = deriveStorefrontTheme("#1455e6", "#ffffff");
    const variables = storefrontThemeCssVariables(theme);

    expect(theme.secondaryDecorationColor).toBe("#ffffff");
    expect(variables["--brand-secondary-decoration"]).toBe("#ffffff");
    expect(theme.accentColor).not.toBe(theme.secondaryDecorationColor);
    expect(contrastRatio(theme.accentColor, "#ffffff")).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("maps only the allowlisted Cairo typography family", () => {
    expect(storefrontTypographyCssVariables("cairo")["--storefront-font-family"]).toContain(
      "Cairo Variable",
    );
    expect(
      storefrontTypographyCssVariables("url(https://evil.example/font.woff2)")[
        "--storefront-font-family"
      ],
    ).toBe(storefrontTypographyCssVariables("cairo")["--storefront-font-family"]);
  });
});
