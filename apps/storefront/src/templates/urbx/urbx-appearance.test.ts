import { describe, expect, it } from "vitest";
import { urbxAppearanceStyle } from "./urbx-appearance";
import { getVisualPreviewProfile } from "../../dev/visual-preview";
import { mapStorefrontProfileResponse } from "../../api/storefront-api";

describe("URBX appearance", () => {
  it("preserves custom appearance through the storefront response and rejects unsafe values", () => {
    const profile = getVisualPreviewProfile("?preview=1&template=urbx");
    const appearance = { navbar_background: "#142536", text_color: "#eeeeee", body_font: "cairo" as const, heading_font: "manrope" as const };
    profile.storefront!.content.appearance = appearance;
    expect(mapStorefrontProfileResponse({ vendor: profile }).storefront?.content.appearance).toEqual(appearance);
    for (const invalid of [{ text_color: "red;display:none" }, { body_font: "external-font" }, { injected: "#ffffff" }]) {
      profile.storefront!.content.appearance = invalid as unknown as typeof appearance;
      expect(() => mapStorefrontProfileResponse({ vendor: profile })).toThrow();
    }
  });
  it("keeps original defaults and maps only approved local fonts and colors", () => {
    expect(urbxAppearanceStyle()).toEqual({});
    expect(urbxAppearanceStyle({ body_font: "original", heading_font: "original" })).toEqual({});
    expect(urbxAppearanceStyle({ navbar_background: "#142536", body_font: "cairo", heading_font: "serif" })).toMatchObject({
      "--urbx-nav-background": "#142536",
      "--urbx-body-font": '"Cairo Variable", "Cairo", sans-serif',
      "--urbx-heading-font": "Georgia, serif",
    });
  });
});
