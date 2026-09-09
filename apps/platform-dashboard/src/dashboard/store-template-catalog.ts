import type { PlatformStorefrontTemplateKey } from "./types"

export const creationTemplatePalettes = {
  drops: { primary: "#009b4d", background: "#ffffff" },
  "luxe-commerce-full": { primary: "#b77f3f", background: "#fffaf5" },
  standard: { primary: "#3f2100", background: "#fcf8f3" },
  "glow-beauty": { primary: "#f35b05", background: "#fffaf5" },
  urbx: { primary: "#d5ff00", background: "#070707" },
  "template-6": { primary: "#eeff66", background: "#2c9db6" },
} as const

export const templateDefinitions: Record<
  PlatformStorefrontTemplateKey,
  { label: string; description: string; image: string; category: string }
> = {
  "template-6": { label: "Template 6", description: "Turquoise fashion welcome with editable text and artwork. More page designs coming next.", image: "/assets/admin/templates/template-6-welcome.jpg", category: "Fashion / Discovery" },
  urbx: { label: "URBX", description: "Bold black and acid-lime streetwear. Welcome, home, shop and category designs available; remaining pages are being added.", image: "/assets/admin/templates/urbx-welcome.png", category: "Streetwear / Urban culture" },
  drops: { label: "Drops", description: "The original sneaker design with resumable store creation and shared commerce.", image: "/assets/admin/templates/drops-commercial.png", category: "Sneakers / Sportswear" },
  "luxe-commerce": {
    label: "Luxe Commerce",
    description: "Editorial presentation for watches, jewellery and premium retail.",
    image: "/assets/admin/templates/luxe-commerce.png",
    category: "Luxury retail",
  },
  "luxe-commerce-full": {
    label: "Luxe Commerce — Full Source",
    description: "The complete Al-Sanousi customer frontend, preserved as a reusable Store template.",
    image: "/assets/admin/templates/luxe-commerce-full-commercial.png",
    category: "Luxury retail / Full source",
  },
  "modern-market": {
    label: "Modern Market",
    description: "Product-led layout for broad catalogues and everyday shopping.",
    image: "/assets/admin/templates/modern-market.png",
    category: "General retail",
  },
  "home-living": {
    label: "Home & Living",
    description: "Warm editorial layout for furniture, decor and home goods.",
    image: "/assets/admin/templates/home-living.png",
    category: "Home",
  },
  standard: {
    label: "Standard",
    description: "A polished responsive storefront for fashion, lifestyle, and general retail.",
    image: "/assets/admin/templates/standard-commercial.png",
    category: "General retail / Responsive",
  },
  "glow-beauty": {
    label: "Glow Beauty",
    description: "A warm, mobile-first beauty storefront with a complete customer journey.",
    image: "/assets/admin/templates/glow-beauty-commercial.png",
    category: "Beauty / Mobile-first",
  },
}

export const templatesStudioVisibleKeys = [
  "drops",
  "luxe-commerce-full",
  "standard",
  "glow-beauty",
  "urbx",
  "template-6",
] as const satisfies readonly PlatformStorefrontTemplateKey[]

