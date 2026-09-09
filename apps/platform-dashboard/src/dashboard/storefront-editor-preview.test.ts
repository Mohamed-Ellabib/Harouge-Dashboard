import { describe, expect, it } from "vitest"

import type {
  PlatformStore,
  PlatformStoreConfiguration,
  PlatformStorefrontDocument,
} from "./types"
import {
  buildStorefrontEditorPreviewProfile,
  resolveStorefrontPreviewOrigin,
} from "./storefront-editor-preview"

const configuration: PlatformStoreConfiguration = {
  name: "My Luxe Store",
  locale: "en-LY",
  contact: {
    public_email: "hello@example.ly",
    public_phone: "+218 91 000 0000",
    whatsapp_number: "+218 92 000 0000",
  },
  brand: {
    logo_url: "https://cdn.example.ly/logo.webp",
    primary_color: "#123456",
    secondary_color: "#abcdef",
    typography_key: "cairo",
  },
}

const document: PlatformStorefrontDocument = {
  schema_version: 1,
  template_key: "luxe-commerce-full",
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
    eyebrow: { ar: "مختارات", en: "Curated" },
    heading: { ar: "عنوان", en: "A new heading" },
    subheading: { ar: "وصف", en: "Description" },
    cta_label: { ar: "تسوق", en: "Shop" },
    cta_target: "catalog",
    image_url: "https://cdn.example.ly/hero.webp",
    slides: [],
    buttons: [],
    benefits: [{
      id: "hero-benefit-support",
      icon: "headset",
      title: { ar: "دعم", en: "Support" },
      subtitle: { ar: "كل يوم", en: "Every day" },
    }],
  },
  brands: {
    heading: { ar: "علاماتنا", en: "Our labels" },
    subheading: { ar: "مختارات", en: "Curated partners" },
    items: [{
      id: "brand-one",
      name: { ar: "علامة واحدة", en: "Brand One" },
      slug: "brand-one",
      image_url: "https://cdn.example.ly/brand-one.webp",
    }],
  },
  about: { title: { ar: "عنا", en: "About" }, body: { ar: "نص", en: "Copy" } },
  contact: { heading: { ar: "تواصل", en: "Contact" }, body: { ar: "نص", en: "Copy" } },
  policies: {
    delivery: { title: { ar: "توصيل", en: "Delivery" }, body: { ar: "نص", en: "Copy" } },
    returns: { title: { ar: "إرجاع", en: "Returns" }, body: { ar: "نص", en: "Copy" } },
    privacy: { title: { ar: "خصوصية", en: "Privacy" }, body: { ar: "نص", en: "Copy" } },
    terms: { title: { ar: "شروط", en: "Terms" }, body: { ar: "نص", en: "Copy" } },
  },
}

const store = {
  id: "store-profile-1",
  handle: "my-luxe-store",
  domains: [
    {
      id: "domain-1",
      hostname: "shop.example.ly",
      is_primary: true,
      verification_status: "verified",
      ssl_status: "active",
    },
  ],
} as PlatformStore

describe("storefront editor preview model", () => {
  it("copies per-store appearance into the preview without mutating the saved document", () => {
    const appearance = { navbar_background: "#142536", text_color: "#eeeeee", body_font: "cairo" as const, heading_font: "manrope" as const }
    const source = { ...document, template_key: "urbx" as const, appearance }
    const profile = buildStorefrontEditorPreviewProfile(store, configuration, source)
    expect(profile.storefront.content.appearance).toEqual(appearance)
    profile.storefront.content.appearance!.navbar_background = "#ffffff"
    expect(source.appearance.navbar_background).toBe("#142536")
  })
  it("combines per-Store branding and the current draft without operational data", () => {
    const profile = buildStorefrontEditorPreviewProfile(store, configuration, document)

    expect(profile.name).toBe("My Luxe Store")
    expect(profile.domain).toBe("shop.example.ly")
    expect(profile.branding.logo_url).toBe("https://cdn.example.ly/logo.webp")
    expect(profile.storefront.template_key).toBe("luxe-commerce-full")
    expect(profile.storefront.content.hero.heading.en).toBe("A new heading")
    expect(profile.storefront.content.hero.benefits[0]).toMatchObject({ icon: "headset", title: { en: "Support" } })
    expect(profile.storefront.content.brands.items[0]).toMatchObject({ name: { en: "Brand One" }, image_url: "https://cdn.example.ly/brand-one.webp" })
    expect(profile.storefront.content.navigation.items.map((item) => item.key)).toEqual([
      "home", "categories", "favorites", "cart", "account", "orders", "settings",
    ])
    expect(profile).not.toHaveProperty("bank_transfer")
    expect(profile).not.toHaveProperty("revision")
  })

  it("keeps incomplete draft edits renderable without changing the saved draft", () => {
    const incompleteConfiguration = {
      ...configuration,
      name: "   ",
      contact: {
        ...configuration.contact,
        public_email: "unfinished@",
      },
    }
    const incompleteDocument = {
      ...document,
      hero: {
        ...document.hero,
        heading: { ar: "", en: "   " },
      },
    }

    const profile = buildStorefrontEditorPreviewProfile(
      store,
      incompleteConfiguration,
      incompleteDocument,
    )

    expect(profile.name).toBe("Untitled Store")
    expect(profile.contact.public_email).toBeNull()
    expect(profile.storefront.content.hero.heading.ar).toBe(
      "عنوان مجموعتك الجديدة",
    )
    expect(profile.storefront.content.hero.heading.en).toBe(
      "Your new collection",
    )
    expect(incompleteDocument.hero.heading).toEqual({ ar: "", en: "   " })
  })

  it("accepts only credential-free HTTP origins", () => {
    expect(resolveStorefrontPreviewOrigin("https://store.example.ly/path", false)).toBe("https://store.example.ly")
    expect(resolveStorefrontPreviewOrigin(undefined, true)).toBe("http://127.0.0.1:5176")
    expect(resolveStorefrontPreviewOrigin(undefined, false)).toBeNull()
    expect(resolveStorefrontPreviewOrigin("javascript:alert(1)", true)).toBeNull()
    expect(resolveStorefrontPreviewOrigin("https://user:secret@example.ly", true)).toBeNull()
  })
})
