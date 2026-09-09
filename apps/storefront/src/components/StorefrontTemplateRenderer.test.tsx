import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  storefrontDirection,
  storefrontLanguage,
} from "../lib/localization";
import {
  STORE_CONTENT_PATHS,
  StoreContentPage,
  storeContentRouteForPath,
} from "../pages/StoreContentPage";
import type {
  ConfiguredStorefrontProfileDto,
  StorefrontLocale,
  StorefrontTemplateKey,
} from "../types";
import {
  STOREFRONT_TEMPLATE_KEYS,
  StorefrontHomeComposition,
  StorefrontTemplateRenderer,
} from "./StorefrontTemplateRenderer";
import { LuxeCommerceSections } from "./LuxeCommerceSections";

const configuredProfile = (
  locale: StorefrontLocale,
  templateKey: StorefrontTemplateKey,
): ConfiguredStorefrontProfileDto => ({
  name: "Nawa",
  handle: "nawa",
  domain: "nawa.example.test",
  locale,
  contact: {
    public_email: "hello@nawa.example",
    public_phone: "+218 91 234 5678",
    whatsapp_number: "+218 92 345 6789",
  },
  branding: {
    logo_url: null,
    primary_color: "#1455e6",
    secondary_color: "#f2b134",
    typography_key: "cairo",
  },
  storefront: {
    schema_version: 1,
    template_key: templateKey,
    content: {
      navigation: {
        items: [
          { key: "home", label: { ar: "الرئيسية", en: "Main" }, enabled: true },
          { key: "categories", label: { ar: "التصنيفات", en: "Categories" }, enabled: true },
          { key: "favorites", label: { ar: "المفضلة", en: "Favorites" }, enabled: false },
          { key: "cart", label: { ar: "السلة", en: "Cart" }, enabled: false },
          { key: "account", label: { ar: "الحساب", en: "Account" }, enabled: false },
          { key: "orders", label: { ar: "الطلبات", en: "Orders" }, enabled: false },
          { key: "settings", label: { ar: "الإعدادات", en: "Settings" }, enabled: false },
        ],
      },
      hero: {
        eyebrow: { ar: "مرحباً", en: "Welcome" },
        heading: { ar: "تسوق الآن", en: "Shop now" },
        subheading: { ar: "منتجات مميزة", en: "Featured products" },
        cta_label: { ar: "المنتجات", en: "Products" },
        cta_target: "catalog",
        image_url: null,
        slides: [],
        buttons: [],
        benefits: [],
      },
      brands: {
        heading: { ar: "علاماتنا", en: "Our partner brands" },
        subheading: { ar: "مختارات موثوقة", en: "A trusted selection" },
        items: [
          { id: "brand-text", name: { ar: "علامة نصية", en: "Text Brand" }, slug: "text-brand", image_url: null },
          { id: "brand-image", name: { ar: "علامة مصورة", en: "Image Brand" }, slug: "image-brand", image_url: "https://cdn.example.test/image-brand.webp" },
        ],
      },
      about: {
        title: { ar: "من نحن", en: "About Nawa" },
        body: { ar: "نبذة عربية", en: "English about copy" },
      },
      contact: {
        heading: { ar: "تواصل معنا", en: "Contact Nawa" },
        body: { ar: "نص التواصل", en: "English contact copy" },
      },
      policies: {
        delivery: {
          title: { ar: "التوصيل", en: "Delivery" },
          body: { ar: "سياسة التوصيل", en: "Delivery policy" },
        },
        returns: {
          title: { ar: "الإرجاع", en: "Returns" },
          body: { ar: "سياسة الإرجاع", en: "Returns policy" },
        },
        privacy: {
          title: { ar: "الخصوصية", en: "Privacy" },
          body: { ar: "سياسة الخصوصية", en: "Privacy policy" },
        },
        terms: {
          title: { ar: "الشروط", en: "Terms" },
          body: { ar: "شروط المتجر", en: "Store terms" },
        },
      },
    },
  },
});

describe("published storefront template renderer", () => {
  it("renders exactly the six allowlisted template roots", () => {
    expect(STOREFRONT_TEMPLATE_KEYS).toEqual([
      "luxe-commerce",
      "luxe-commerce-full",
      "modern-market",
      "home-living",
      "standard",
      "glow-beauty",
    ]);

    for (const key of STOREFRONT_TEMPLATE_KEYS) {
      const html = renderToStaticMarkup(
        <StorefrontTemplateRenderer locale="en-LY" templateKey={key}>
          <main><h1>{key}</h1></main>
        </StorefrontTemplateRenderer>,
      );

      expect(html).toContain(`data-storefront-template="${key}"`);
      expect(html).toContain(`storefront-template--${key}`);
      expect(html).toContain('dir="ltr"');
      expect(html).toContain('lang="en"');
      expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
    }
  });

  it("changes only the home presentation order for each template", () => {
    const render = (templateKey: StorefrontTemplateKey) =>
      renderToStaticMarkup(
        <StorefrontHomeComposition
          templateKey={templateKey}
          hero={<span>hero</span>}
          catalog={<span>catalog</span>}
          about={<span>about</span>}
          contact={<span>contact</span>}
        />,
      );

    expect(render("luxe-commerce")).toBe(
      "<span>hero</span><span>catalog</span><span>about</span><span>contact</span>",
    );
    expect(render("luxe-commerce-full")).toBe(
      "<span>hero</span><span>catalog</span><span>about</span><span>contact</span>",
    );
    expect(render("modern-market")).toBe(
      "<span>hero</span><span>catalog</span><span>contact</span><span>about</span>",
    );
    expect(render("home-living")).toBe(
      "<span>hero</span><span>about</span><span>catalog</span><span>contact</span>",
    );
    expect(render("standard")).toBe(
      "<span>hero</span><span>about</span><span>catalog</span><span>contact</span>",
    );
    expect(render("glow-beauty")).toBe(
      "<span>hero</span><span>about</span><span>catalog</span><span>contact</span>",
    );
  });

  it("renders the luxe editorial sections from Store-owned data only", () => {
    const luxeProfile = configuredProfile("en-LY", "luxe-commerce");
    luxeProfile.storefront.content.hero.benefits = [{
      id: "hero-benefit-support",
      icon: "headset",
      title: { ar: "دعم موثوق", en: "Trusted support" },
      subtitle: { ar: "نحن هنا للمساعدة", en: "Here when you need us" },
    }];
    const html = renderToStaticMarkup(
      <LuxeCommerceSections
        profile={luxeProfile}
        products={[
          {
            handle: "linen-cushion",
            title: "Linen cushion",
            subtitle: "Neutral texture",
            thumbnail_url: "https://cdn.example.test/linen-cushion.jpg",
          },
        ]}
      />,
    );

    expect(html).toContain("Trusted support");
    expect(html).toContain("Here when you need us");
    expect(html).toContain("Our partner brands");
    expect(html).toContain("Text Brand");
    expect(html).toContain("https://cdn.example.test/image-brand.webp");
    expect(html).toContain("Linen cushion");
    expect(html).toContain("/products/linen-cushion");
    expect(html).toContain("https://cdn.example.test/linen-cushion.jpg");
    expect(html).not.toMatch(/bank|revision|audit|draft/iu);

    const fullSourceHtml = renderToStaticMarkup(
      <LuxeCommerceSections
        profile={configuredProfile("en-LY", "luxe-commerce-full")}
        products={[]}
      />,
    );
    expect(fullSourceHtml).toContain(
      "/assets/luxe-full/customer-assets/category-watch.webp",
    );
    expect(fullSourceHtml).not.toContain("luxe-service-strip");

    const withoutBrands = configuredProfile("en-LY", "luxe-commerce");
    withoutBrands.storefront.content.brands.items = [];
    expect(renderToStaticMarkup(<LuxeCommerceSections profile={withoutBrands} products={[]} />)).not.toContain("luxe-brand-rail");

    const modernHtml = renderToStaticMarkup(
      <LuxeCommerceSections
        profile={configuredProfile("en-LY", "modern-market")}
        products={[]}
      />,
    );
    expect(modernHtml).toBe("");
  });

  it("maps locale direction and all required content routes exactly", () => {
    expect(storefrontLanguage("ar-LY")).toBe("ar");
    expect(storefrontDirection("ar-LY")).toBe("rtl");
    expect(storefrontLanguage("en-LY")).toBe("en");
    expect(storefrontDirection("en-LY")).toBe("ltr");

    expect(Object.keys(STORE_CONTENT_PATHS)).toEqual([
      "/about",
      "/contact",
      "/delivery-returns",
      "/privacy",
      "/terms",
    ]);
    expect(storeContentRouteForPath("/delivery-returns")).toBe(
      "delivery-returns",
    );
    expect(storeContentRouteForPath("/unknown")).toBeNull();
  });

  it("renders localized plain-text content and bounded public contact only", () => {
    const html = renderToStaticMarkup(
      <StoreContentPage
        profile={configuredProfile("en-LY", "modern-market")}
        route="contact"
      />,
    );

    expect(html).toContain("Contact Nawa");
    expect(html).toContain("English contact copy");
    expect(html).not.toContain("نص التواصل");
    expect(html).toContain("mailto:hello@nawa.example");
    expect(html).toContain("https://wa.me/218923456789");
    expect(html).not.toContain("bank");
    expect(html).not.toContain("revision");
    expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
  });

  it("keeps every published content route inside each allowlisted template", () => {
    for (const templateKey of STOREFRONT_TEMPLATE_KEYS) {
      const profile = configuredProfile("ar-LY", templateKey);

      for (const route of Object.values(STORE_CONTENT_PATHS)) {
        const html = renderToStaticMarkup(
          <StorefrontTemplateRenderer
            locale={profile.locale}
            templateKey={templateKey}
          >
            <StoreContentPage profile={profile} route={route} />
          </StorefrontTemplateRenderer>,
        );

        expect(html).toContain(`data-storefront-template="${templateKey}"`);
        expect(html).toContain('dir="rtl"');
        expect(html).toContain('lang="ar"');
        expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
        expect(html).not.toMatch(/bank|revision|audit|draft/iu);
      }
    }
  });
});
