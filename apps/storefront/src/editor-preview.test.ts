import { describe, expect, it } from "vitest";

import {
  allowedStorefrontEditorOrigins,
  parseStorefrontEditorPreviewCatalog,
  parseStorefrontEditorPreviewProfile,
} from "./editor-preview";
import { getVisualPreviewProfile } from "./dev/visual-preview";
import { template6HomeContent } from "./templates/template-6/template-6-home-content";

describe("Storefront Studio preview bridge", () => {
  it("accepts Template 6's intentionally empty promotional copy without replacing it", () => {
    const profile = getVisualPreviewProfile("?preview=1&template=luxe-commerce-full&locale=en-LY");
    profile.storefront!.template_key = "template-6";
    const home = {
      ...template6HomeContent,
      promotion_eyebrow: { ar: "", en: "" },
      promotion_heading: { ar: "", en: "" },
      promotion_detail: { ar: "", en: "" },
    };
    profile.storefront!.content.home = home;
    expect(parseStorefrontEditorPreviewProfile(profile)?.storefront?.content.home).toEqual(home);
    for (const field of ["promotion_eyebrow", "promotion_heading", "promotion_detail"] as const) {
      profile.storefront!.content.home = { ...home, [field]: { ar: "", en: "<script>" } };
      expect(parseStorefrontEditorPreviewProfile(profile)).toBeNull();
    }
  });

  it("accepts the bounded public profile and rejects malformed preview data", () => {
    const profile = getVisualPreviewProfile(
      "?preview=1&template=luxe-commerce-full&locale=en-LY",
    );
    profile.name = "Edited Store Name";
    profile.branding.logo_url = "https://cdn.example.ly/logo.webp";

    expect(parseStorefrontEditorPreviewProfile(profile)?.name).toBe(
      "Edited Store Name",
    );
    expect(
      parseStorefrontEditorPreviewProfile({
        ...profile,
        storefront: {
          ...profile.storefront,
          content: {
            ...profile.storefront?.content,
            hero: {
              ...profile.storefront?.content.hero,
              heading: { ar: "<script>", en: "Unsafe" },
            },
          },
        },
      }),
    ).toBeNull();
  });

  it("uses only credential-free admin origins", () => {
    expect(allowedStorefrontEditorOrigins("https://admin.example.ly/path", false)).toEqual([
      "https://admin.example.ly",
    ]);
    expect(allowedStorefrontEditorOrigins("https://user:pass@example.ly", false)).toEqual([]);
    expect(allowedStorefrontEditorOrigins(undefined, true)).toContain(
      "http://127.0.0.1:5174",
    );
    expect(allowedStorefrontEditorOrigins(undefined, true)).toContain(
      "http://127.0.0.1:5177",
    );
  });

  it("accepts the bounded real Store catalog used by the editor iframe", () => {
    const catalog = parseStorefrontEditorPreviewCatalog([{
      handle: "glow-store-radiance-serum",
      title: "Radiance Serum",
      subtitle: "Brightening & Glow",
      description: "A lightweight illuminating serum.",
      thumbnail_url: "/assets/glow-beauty/product-radiance-serum.png",
      image_urls: ["/assets/glow-beauty/product-radiance-serum-detail.png"],
      price_lyd: 125,
      compare_at_price_lyd: 160,
      category: "Skincare",
      badge: "BEST SELLER",
      options: [
        { name: "size", values: ["30 ml"] },
        { name: "color", values: ["Rose"] },
      ],
      variants: [{
        id: "editor-preview:glow-store-radiance-serum:0",
        title: "30 ml / Rose",
        options: { size: "30 ml", color: "Rose" },
        unit_price: 125,
        available_for_sale: true,
      }],
    }]);

    expect(catalog?.[0]).toMatchObject({
      title: "Radiance Serum",
      price_lyd: 125,
      category: "Skincare",
      purchase: { variants: [{ available_for_sale: true }] },
    });
    expect(parseStorefrontEditorPreviewCatalog([{ handle: "unsafe", title: "Unsafe", subtitle: null, description: null, thumbnail_url: "javascript:alert(1)", image_urls: [], price_lyd: null, compare_at_price_lyd: null, category: null, badge: null, options: [], variants: [] }])).toBeNull();
  });
});
