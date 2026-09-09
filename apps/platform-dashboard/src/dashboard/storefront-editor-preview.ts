import type {
  PlatformStore,
  PlatformStoreConfiguration,
  PlatformStorefrontDocument,
  PlatformStorefrontPreview,
} from "./types"

export const STOREFRONT_EDITOR_PREVIEW_MESSAGE =
  "labibtech:storefront-editor-preview" as const

export const STOREFRONT_EDITOR_PREVIEW_READY_MESSAGE =
  "labibtech:storefront-editor-preview-ready" as const

export type StorefrontEditorPreviewProfile = {
  name: string
  handle: string
  domain: string | null
  locale: "ar-LY" | "en-LY"
  contact: PlatformStoreConfiguration["contact"]
  branding: {
    logo_url: string | null
    primary_color: string | null
    secondary_color: string | null
    typography_key: "cairo"
  }
  storefront: {
    schema_version: 1
    template_key: PlatformStorefrontDocument["template_key"]
    content: Omit<
      PlatformStorefrontDocument,
      "schema_version" | "template_key"
    >
  }
}

export type StorefrontEditorPreviewMessage = {
  type: typeof STOREFRONT_EDITOR_PREVIEW_MESSAGE
  version: 1
  channel: string
  profile: StorefrontEditorPreviewProfile
  catalog: PlatformStorefrontPreview["products"]
  commerce_available: boolean
}

const previewText = (value: string, fallback: string): string =>
  value.trim() || fallback

const previewLocalizedText = (
  value: PlatformStorefrontDocument["hero"]["heading"],
  fallback: { ar: string; en: string },
) => ({
  ar: previewText(value.ar, fallback.ar),
  en: previewText(value.en, fallback.en),
})

const previewDocumentContent = (
  document: PlatformStorefrontDocument,
): StorefrontEditorPreviewProfile["storefront"]["content"] => ({
  ...(document.home ? { home: structuredClone(document.home) } : {}),
  ...(document.appearance ? { appearance: structuredClone(document.appearance) } : {}),
  ...(document.shop ? { shop: structuredClone(document.shop) } : {}),
  navigation: {
    items: document.navigation.items.map((item) => ({
      ...item,
      label: previewLocalizedText(item.label, item.label),
    })),
  },
  hero: {
    ...document.hero,
    eyebrow: previewLocalizedText(document.hero.eyebrow, {
      ar: "مختارات مميزة",
      en: "Curated selection",
    }),
    heading: previewLocalizedText(document.hero.heading, {
      ar: "عنوان مجموعتك الجديدة",
      en: "Your new collection",
    }),
    subheading: previewLocalizedText(document.hero.subheading, {
      ar: "أضف وصف واجهة متجرك هنا.",
      en: "Add your storefront introduction here.",
    }),
    cta_label: previewLocalizedText(document.hero.cta_label, {
      ar: "تصفح المنتجات",
      en: "Browse products",
    }),
    slides: document.hero.slides.map((slide, index) => ({
      ...slide,
      alt: previewLocalizedText(slide.alt, {
        ar: `صورة الواجهة ${index + 1}`,
        en: `Hero image ${index + 1}`,
      }),
    })),
    buttons: document.hero.buttons.map((button) => ({
      ...button,
      label: previewLocalizedText(button.label, {
        ar: "تصفح المنتجات",
        en: "Browse products",
      }),
    })),
    benefits: document.hero.benefits.map((benefit, index) => ({
      ...benefit,
      title: previewLocalizedText(benefit.title, {
        ar: `ميزة المتجر ${index + 1}`,
        en: `Store benefit ${index + 1}`,
      }),
      subtitle: previewLocalizedText(benefit.subtitle, {
        ar: "تفاصيل الميزة",
        en: "Benefit details",
      }),
    })),
  },
  brands: {
    ...(document.brands.search_placeholder ? { search_placeholder: structuredClone(document.brands.search_placeholder) } : {}),
    ...(document.brands.explore_label ? { explore_label: structuredClone(document.brands.explore_label) } : {}),
    ...(document.brands.view_all_label ? { view_all_label: structuredClone(document.brands.view_all_label) } : {}),
    ...(document.brands.promotion_heading ? { promotion_heading: structuredClone(document.brands.promotion_heading) } : {}),
    ...(document.brands.promotion_subheading ? { promotion_subheading: structuredClone(document.brands.promotion_subheading) } : {}),
    ...(document.brands.promotion_image_url !== undefined ? { promotion_image_url: document.brands.promotion_image_url } : {}),
    heading: previewLocalizedText(document.brands.heading, {
      ar: "علاماتنا التجارية",
      en: "Our brands",
    }),
    subheading: previewLocalizedText(document.brands.subheading, {
      ar: "مجموعة مختارة من العلامات المتوفرة لدينا.",
      en: "A curated selection of brands available in our Store.",
    }),
    items: document.brands.items.map((brand, index) => ({
      ...brand,
      name: previewLocalizedText(brand.name, {
        ar: `العلامة ${index + 1}`,
        en: `Brand ${index + 1}`,
      }),
    })),
  },
  about: {
    title: previewLocalizedText(document.about.title, {
      ar: "قصتنا",
      en: "Our story",
    }),
    body: previewLocalizedText(document.about.body, {
      ar: "أضف قصة متجرك هنا.",
      en: "Add your Store story here.",
    }),
  },
  contact: {
    heading: previewLocalizedText(document.contact.heading, {
      ar: "تواصل معنا",
      en: "Contact us",
    }),
    body: previewLocalizedText(document.contact.body, {
      ar: "أضف تفاصيل التواصل هنا.",
      en: "Add your contact details here.",
    }),
  },
  policies: {
    delivery: {
      title: previewLocalizedText(document.policies.delivery.title, {
        ar: "سياسة التوصيل",
        en: "Delivery policy",
      }),
      body: previewLocalizedText(document.policies.delivery.body, {
        ar: "أضف سياسة التوصيل هنا.",
        en: "Add your delivery policy here.",
      }),
    },
    returns: {
      title: previewLocalizedText(document.policies.returns.title, {
        ar: "سياسة الاسترجاع",
        en: "Returns policy",
      }),
      body: previewLocalizedText(document.policies.returns.body, {
        ar: "أضف سياسة الاسترجاع هنا.",
        en: "Add your returns policy here.",
      }),
    },
    privacy: {
      title: previewLocalizedText(document.policies.privacy.title, {
        ar: "سياسة الخصوصية",
        en: "Privacy policy",
      }),
      body: previewLocalizedText(document.policies.privacy.body, {
        ar: "أضف سياسة الخصوصية هنا.",
        en: "Add your privacy policy here.",
      }),
    },
    terms: {
      title: previewLocalizedText(document.policies.terms.title, {
        ar: "الشروط والأحكام",
        en: "Terms and conditions",
      }),
      body: previewLocalizedText(document.policies.terms.body, {
        ar: "أضف الشروط والأحكام هنا.",
        en: "Add your terms and conditions here.",
      }),
    },
  },
})

const previewContact = (
  contact: PlatformStoreConfiguration["contact"],
): PlatformStoreConfiguration["contact"] => {
  const validEmail = contact.public_email?.trim()
  const validPublicPhone = contact.public_phone?.trim()
  const validWhatsapp = contact.whatsapp_number?.trim()
  const phonePattern = /^\+?[0-9](?:[0-9 ()-]{3,38}[0-9])?$/u

  return {
    public_email:
      validEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(validEmail)
        ? validEmail
        : null,
    public_phone:
      validPublicPhone && phonePattern.test(validPublicPhone)
        ? validPublicPhone
        : null,
    whatsapp_number:
      validWhatsapp && phonePattern.test(validWhatsapp) ? validWhatsapp : null,
  }
}

const verifiedDomain = (store: Pick<PlatformStore, "domains">): string | null =>
  store.domains.find(
    (domain) =>
      domain.is_primary &&
      domain.verification_status === "verified" &&
      domain.ssl_status === "active",
  )?.hostname ??
  store.domains.find(
    (domain) =>
      domain.verification_status === "verified" &&
      domain.ssl_status === "active",
  )?.hostname ??
  null

export const buildStorefrontEditorPreviewProfile = (
  store: Pick<PlatformStore, "handle" | "domains">,
  configuration: PlatformStoreConfiguration,
  document: PlatformStorefrontDocument,
): StorefrontEditorPreviewProfile => {
  const { template_key } = document

  return {
    name: configuration.name.trim() || "Untitled Store",
    handle: store.handle,
    domain: verifiedDomain(store),
    locale: configuration.locale === "en-LY" ? "en-LY" : "ar-LY",
    contact: previewContact(configuration.contact),
    branding: {
      ...configuration.brand,
      typography_key: "cairo",
    },
    storefront: {
      schema_version: 1,
      template_key,
      content: previewDocumentContent(document),
    },
  }
}

export const resolveStorefrontPreviewOrigin = (
  configuredOrigin: string | undefined,
  development: boolean,
): string | null => {
  const candidate = configuredOrigin?.trim() ||
    (development ? "http://127.0.0.1:5176" : "")
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}
