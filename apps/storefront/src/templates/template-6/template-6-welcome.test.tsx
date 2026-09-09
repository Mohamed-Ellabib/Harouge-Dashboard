import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getVisualPreviewProfile, resolveVisualPreviewOptions } from "../../dev/visual-preview";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import Template6WelcomePage from "./Template6WelcomePage";
import { template6Welcome } from "./template-6-preview-data";

describe("Template 6 welcome", () => {
  it("registers a separate preview without borrowing another template's catalog or identity", () => {
    expect(resolveVisualPreviewOptions("?template=template-6").templateKey).toBe("template-6");
    const profile = getVisualPreviewProfile("?template=template-6") as ConfiguredStorefrontProfileDto;
    expect(profile.name).toBe("Template 6");
    expect(profile.storefront.content.brands.items.map(item => item.slug)).toEqual(["men", "women", "shoes", "bags", "accessories", "streetwear"]);
    expect(profile.storefront.content.hero.heading.en).toBe(template6Welcome.heading);
    expect(profile.storefront.content.hero.buttons[0].href).toBe("/");
    const markup = renderToStaticMarkup(<Template6WelcomePage profile={profile} />);
    expect(markup).toContain(template6Welcome.image);
    expect(markup).toContain("GET STARTED");
    expect(markup).toContain("DISCOVER BEST</span><span>DEALS ITEMS</span><span>NEARBY");
    expect(markup).not.toContain("URBX");
  });

  it("renders saved content, artwork and colors without modifying the default preview", () => {
    const profile = getVisualPreviewProfile("?template=template-6") as ConfiguredStorefrontProfileDto;
    profile.name = "My Shop";
    profile.branding.primary_color = "#ccffaa";
    profile.storefront.content.hero.heading.en = "MY EDITED HEADLINE";
    profile.storefront.content.hero.subheading.en = "My own description";
    profile.storefront.content.hero.cta_label.en = "EXPLORE";
    profile.storefront.content.hero.slides[0].image_url = "/assets/my-welcome.png";
    const markup = renderToStaticMarkup(<Template6WelcomePage profile={profile} />);
    for (const value of ["MY EDITED HEADLINE", "My own description", "EXPLORE", "#ccffaa", "/assets/my-welcome.png", "My Shop welcome"]) expect(markup).toContain(value);
    expect(getVisualPreviewProfile("?template=template-6").storefront?.content.hero.heading.en).toBe(template6Welcome.heading);
  });
});
