import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LuxeFullBrands, LuxeFullHeroBenefits } from "./LuxeFullHomePage";

describe("Luxe Full hero benefits", () => {
  it("renders Store-owned content and the selected icon", () => {
    const html = renderToStaticMarkup(
      <LuxeFullHeroBenefits
        locale="en-LY"
        benefits={[{
          id: "hero-benefit-support",
          icon: "headset",
          title: { ar: "دعم مباشر", en: "Direct support" },
          subtitle: { ar: "نحن هنا للمساعدة", en: "Here when you need us" },
        }]}
      />,
    );

    expect(html).toContain("customer-hero-trust");
    expect(html).toContain("Direct support");
    expect(html).toContain("Here when you need us");
    expect(html).toContain("<svg");
  });

  it("removes the whole strip when every item is removed", () => {
    expect(renderToStaticMarkup(<LuxeFullHeroBenefits benefits={[]} locale="ar-LY" />)).toBe("");
  });
});

describe("Luxe Full brands", () => {
  const brands = {
    heading: { ar: "علاماتنا", en: "Our brands" },
    subheading: { ar: "مختاراتنا", en: "Our selection" },
    items: [
      { id: "brand-text", name: { ar: "علامة نصية", en: "Text Brand" }, slug: "text-brand", image_url: null },
      { id: "brand-image", name: { ar: "علامة مصورة", en: "Image Brand" }, slug: "image-brand", image_url: "/images/image-brand.webp" },
    ],
  };

  it("renders text-only and image brand cards from Store-owned content", () => {
    const html = renderToStaticMarkup(<LuxeFullBrands brands={brands} locale="en-LY" />);
    expect(html).toContain("Our brands");
    expect(html).toContain("Text Brand");
    expect(html).toContain('/images/image-brand.webp');
    expect(html).toContain('/brands/text-brand');
  });

  it("removes the whole section when every brand is removed", () => {
    expect(renderToStaticMarkup(<LuxeFullBrands brands={{ ...brands, items: [] }} locale="ar-LY" />)).toBe("");
  });
});
