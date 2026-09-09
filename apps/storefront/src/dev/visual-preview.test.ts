import { describe, expect, it } from "vitest";

import {
  getVisualPreviewProfile,
  resolveVisualPreviewOptions,
} from "./visual-preview";

describe("visual preview options", () => {
  it("selects every allowlisted template and locale combination", () => {
    const templates = [
      "luxe-commerce",
      "luxe-commerce-full",
      "modern-market",
      "home-living",
      "standard",
      "glow-beauty",
    ] as const;
    const locales = ["ar-LY", "en-LY"] as const;

    for (const templateKey of templates) {
      for (const locale of locales) {
        expect(
          resolveVisualPreviewOptions(
            `?template=${templateKey}&locale=${locale}`,
          ),
        ).toEqual({ templateKey, locale });

        const profile = getVisualPreviewProfile(
          `?template=${templateKey}&locale=${locale}`,
        );
        expect(profile.locale).toBe(locale);
        expect(profile.storefront?.template_key).toBe(templateKey);
      }
    }
  });

  it("keeps the existing safe defaults for absent or unallowlisted values", () => {
    expect(resolveVisualPreviewOptions("")).toEqual({
      templateKey: "home-living",
      locale: "ar-LY",
    });
    expect(
      resolveVisualPreviewOptions(
        "?template=merchant-code&locale=fr-FR&unrelated=value",
      ),
    ).toEqual({
      templateKey: "home-living",
      locale: "ar-LY",
    });

    const standardPreview = getVisualPreviewProfile("?template=standard");
    expect(standardPreview.locale).toBe("en-LY");
    expect(standardPreview.storefront?.template_key).toBe("standard");
  });

  it("returns independent profile data for each preview selection", () => {
    const first = getVisualPreviewProfile(
      "?template=luxe-commerce&locale=en-LY",
    );
    const second = getVisualPreviewProfile(
      "?template=modern-market&locale=ar-LY",
    );

    expect(first.storefront).not.toBe(second.storefront);
    expect(first.storefront?.content).not.toBe(second.storefront?.content);
    expect(first.storefront?.template_key).toBe("luxe-commerce");
    expect(first.locale).toBe("en-LY");
    expect(second.storefront?.template_key).toBe("modern-market");
    expect(second.locale).toBe("ar-LY");
  });
});
