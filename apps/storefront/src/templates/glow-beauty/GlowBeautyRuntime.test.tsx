import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { CartProvider } from "../../commerce/CartContext";
import { FavoritesProvider } from "../../commerce/FavoritesContext";
import type {
  ConfiguredStorefrontProfileDto,
  StorefrontCommerceCapabilitiesDto,
} from "../../types";
import { GlowBeautyCartPage } from "./GlowBeautyCartPage";
import { GlowBeautyCheckoutPage } from "./GlowBeautyCheckoutPage";
import { GlowBeautyHomePage } from "./GlowBeautyHomePage";
import { GlowBeautyOrderPlacedPage } from "./GlowBeautyOrderPlacedPage";
import { GlowBeautyBottomNav } from "./GlowBeautyChrome";

const profile: ConfiguredStorefrontProfileDto = {
  name: "Noor Apothecary",
  handle: "noor-apothecary",
  domain: "noor.example.test",
  locale: "en-LY",
  contact: {
    public_email: "care@noor.example",
    public_phone: null,
    whatsapp_number: "+218912345678",
  },
  branding: {
    logo_url: null,
    primary_color: "#8b5147",
    secondary_color: "#f5d9cd",
    typography_key: "cairo",
  },
  storefront: {
    schema_version: 1,
    template_key: "glow-beauty",
    content: {
      navigation: {
        items: [
          { key: "home", label: { ar: "الرئيسية", en: "Home" }, enabled: true },
          { key: "categories", label: { ar: "التصنيفات", en: "Products" }, enabled: true },
          { key: "favorites", label: { ar: "المفضلة", en: "Favorites" }, enabled: true },
          { key: "cart", label: { ar: "السلة", en: "Bag" }, enabled: true },
          { key: "account", label: { ar: "الحساب", en: "Account" }, enabled: true },
          { key: "orders", label: { ar: "الطلبات", en: "Orders" }, enabled: false },
          { key: "settings", label: { ar: "الإعدادات", en: "Settings" }, enabled: false },
        ],
      },
      hero: {
        eyebrow: { ar: "عناية ليبية", en: "Libyan care" },
        heading: { ar: "طقوس نور اليومية", en: "Noor daily rituals" },
        subheading: { ar: "منتجات المتجر المنشورة", en: "Published Store products" },
        cta_label: { ar: "تسوقي الآن", en: "Shop now" },
        cta_target: "catalog",
        image_url: null,
        slides: [],
        buttons: [],
        benefits: [],
      },
      brands: {
        heading: { ar: "مجموعات", en: "Collections" },
        subheading: { ar: "مختارات", en: "Curated care" },
        items: [],
      },
      about: {
        title: { ar: "عن نور", en: "About Noor" },
        body: { ar: "متجر عناية", en: "A care-led Store" },
      },
      contact: {
        heading: { ar: "تواصلي معنا", en: "Contact Noor" },
        body: { ar: "نحن هنا", en: "We are here to help" },
      },
      policies: {
        delivery: { title: { ar: "التوصيل", en: "Delivery" }, body: { ar: "سياسة التوصيل", en: "Delivery policy" } },
        returns: { title: { ar: "الإرجاع", en: "Returns" }, body: { ar: "سياسة الإرجاع", en: "Returns policy" } },
        privacy: { title: { ar: "الخصوصية", en: "Privacy" }, body: { ar: "سياسة الخصوصية", en: "Privacy policy" } },
        terms: { title: { ar: "الشروط", en: "Terms" }, body: { ar: "شروط المتجر", en: "Store terms" } },
      },
    },
  },
};

const capability: StorefrontCommerceCapabilitiesDto = {
  online_checkout: {
    status: "available",
    currency_code: "lyd",
    country_codes: ["ly"],
    payment_methods: ["cod", "bank_transfer"],
  },
};

const withCommerce = (child: ReactNode) => renderToStaticMarkup(
  <CartProvider capability={capability} locale={profile.locale} storeHandle={profile.handle}>
    <FavoritesProvider storeHandle={profile.handle}>{child}</FavoritesProvider>
  </CartProvider>,
);

describe("Glow Beauty live adapters", () => {
  it.each([
    ["/", "Home"], ["/products", "Products"], ["/products/radiance-serum", "Products"],
    ["/favorites", "Favorites"], ["/cart", "Bag"], ["/checkout", "Bag"], ["/account", "Account"],
  ])("keeps the published navigation and active item at %s", (pathname, label) => {
    const html = withCommerce(<GlowBeautyBottomNav profile={profile} pathname={pathname} />);
    expect((html.match(/<nav /g) ?? [])).toHaveLength(1);
    expect((html.match(/<a /g) ?? [])).toHaveLength(5);
    const activeLink = html.match(/<a\b[^>]*class="is-active"[^>]*>[\s\S]*?<\/a>/)?.[0];
    expect(activeLink).toContain(`>${label}</span>`);
    expect(html).not.toContain('href="/orders"');
    expect(html).toContain('href="/account"');
  });

  it("renders published profile content without preview product or offer fixtures", () => {
    const markup = withCommerce(<GlowBeautyHomePage profile={profile} />);

    expect(markup).toContain("Noor Apothecary");
    expect(markup).toContain("Noor daily rituals");
    expect(markup).toContain("Published Store products");
    expect(markup).not.toContain("Radiance Serum");
    expect(markup).not.toContain("Up to 30% Off");
    expect(markup).not.toContain("3 notifications");
  });

  it("keeps cart, checkout, and confirmation empty states free of preview commerce data", () => {
    const cartMarkup = withCommerce(<GlowBeautyCartPage profile={profile} />);
    const checkoutMarkup = withCommerce(<GlowBeautyCheckoutPage profile={profile} />);
    const confirmationMarkup = withCommerce(<GlowBeautyOrderPlacedPage profile={profile} />);

    expect(cartMarkup).toContain("Your bag is empty");
    expect(cartMarkup).not.toContain("GLOW5");
    expect(cartMarkup).not.toContain("Radiance Serum");

    expect(checkoutMarkup).toContain("Cash on delivery");
    expect(checkoutMarkup).toContain("Manual bank transfer");
    expect(checkoutMarkup).not.toContain("Visa ending");
    expect(checkoutMarkup).not.toContain("GLOW5");

    expect(confirmationMarkup).toContain("Confirmation unavailable");
    expect(confirmationMarkup).not.toContain("GLW-28462");
    expect(confirmationMarkup).not.toContain("Sophia");
    expect(confirmationMarkup).not.toContain("Visa");
  });
});
