import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { uploadPlatformImage } from "../api"
import type { PlatformStorefrontDocument } from "../types"
import { urbxHomeDefaults, urbxShopDefaults } from "../urbx-home-defaults"
import { template6HomeDefaults } from "../template-6-home-defaults"

export type GlowContentField = {
  key: string
  label: string
  value: string
  image: boolean
  maximum: number
}

// Explicit canonical fields only: never accept an arbitrary object path from an iframe.
export function glowContentField(document: PlatformStorefrontDocument, key: string, language: "ar" | "en" = "en"): GlowContentField | null {
  if (key === "contact.heading") return { key, label: "Support heading", maximum: 160, image: false, value: document.contact.heading[language] }
  if (key === "contact.body") return { key, label: "Support subtitle", maximum: 3000, image: false, value: document.contact.body[language] }
  if (key === "brands.promotion_image_url") return { key, label: "Explore banner image", maximum: 2048, image: true, value: document.brands.promotion_image_url ?? "" }
  const categoryCopy = { heading: ["Shop by category", 160], subheading: ["Find your next statement piece.", 300], search_placeholder: ["Search categories or products…", 80], explore_label: ["EXPLORE", 60], view_all_label: ["View all products", 60], promotion_heading: ["FRESH FINDS", 100], promotion_subheading: ["Explore the latest arrivals", 160] } as const
  if (key.startsWith("brands.") && Object.hasOwn(categoryCopy, key.slice(7))) {
    const name = key.slice(7) as keyof typeof categoryCopy
    return { key, label: `Categories ${name.replaceAll("_", " ")}`, value: document.brands[name]?.[language] ?? categoryCopy[name][0], maximum: categoryCopy[name][1], image: false }
  }
  const shop = document.shop ?? (document.template_key === "urbx" ? urbxShopDefaults : null)
  if (key.startsWith("shop.") && shop && Object.hasOwn(shop, key.slice(5))) {
    const property = key.slice(5) as keyof typeof shop
    return { key, label: `Shop ${property.replaceAll("_", " ")}`, value: shop[property][language], image: false, maximum: property === "search_placeholder" ? 80 : 60 }
  }
  const home = document.home ?? (document.template_key === "urbx" ? urbxHomeDefaults : document.template_key === "template-6" ? template6HomeDefaults : null)
  if (key.startsWith("home.") && home) {
    const property = key.slice(5);
    if (Object.hasOwn(home, property)) {
      const value = home[property as keyof typeof home];
      const image = property === "image_url" || property === "promotion_image_url";
      return { key, label: `Home ${property.replaceAll("_", " ")}`, image,
        maximum: image ? 2048 : ["heading", "promotion_heading", "promotion_detail"].includes(property) ? 100 : 60,
        value: typeof value === "string" ? value : value[language] };
    }
  }
  if (key === "about.title") return { key, label: "Brand tagline", maximum: 160, image: false, value: document.about.title[language] }
  const benefitMatch = /^benefit\.([a-z0-9-]+)\.(title|subtitle)$/.exec(key)
  const benefit = benefitMatch && document.hero.benefits.find(item => item.id === benefitMatch[1])
  if (benefit && benefitMatch) return { key, label: "Welcome benefit", maximum: benefitMatch[2] === "title" ? 60 : 80,
    image: false, value: benefit[benefitMatch[2] as "title" | "subtitle"][language] }
  const heroFields = {
    eyebrow: ["Hero caption", 80], heading: ["Hero heading", 160],
    subheading: ["Hero description", 600], cta_label: ["Shop button text", 60],
  } as const
  if (key.startsWith("hero.")) {
    const name = key.slice(5) as keyof typeof heroFields
    if (Object.hasOwn(heroFields, name)) {
      const [label, maximum] = heroFields[name]
      return { key, label, maximum, image: false, value: document.hero[name][language] }
    }
  }
  if (key === "hero.image" || key === "offer.image") {
    const index = key === "hero.image" ? 0 : 1
    return { key, label: index ? "Offer image" : "Hero image", maximum: 2048, image: true,
      value: document.hero.slides.filter(slide => slide.enabled)[index]?.image_url ?? (index ? "" : document.hero.image_url ?? "") }
  }
  const brandMatch = /^category\.([a-z0-9-]+)\.(name|image|banner)$/.exec(key)
  const brand = brandMatch && document.brands.items.find(item => item.slug === brandMatch[1])
  if (brand && brandMatch) return { key, label: `${brand.name[language]} ${brandMatch[2] === "name" ? "label" : "image"}`,
    image: brandMatch[2] !== "name", maximum: brandMatch[2] !== "name" ? 2048 : 80,
    value: brandMatch[2] === "banner" ? brand.banner_image_url ?? (document.template_key === "urbx" && ["hoodies", "t-shirts", "bottoms", "accessories"].includes(brand.slug) && brand.image_url?.startsWith("/assets/urbx/category-") ? `/assets/urbx/categories-${brand.slug.replace("t-shirts", "tshirts")}-v1.png` : brand.image_url ?? "") : brandMatch[2] === "image" ? brand.image_url ?? "" : brand.name[language] }
  const navKey = key.startsWith("navigation.") ? key.slice(11) : null
  const item = document.navigation.items.find(item => item.key === navKey)
  return item ? { key, label: "Navigation label", image: false, maximum: 60, value: item.label[language] } : null
}

export function applyGlowContent(document: PlatformStorefrontDocument, key: string, value: string, language: "ar" | "en" = "en"): PlatformStorefrontDocument {
  if (!glowContentField(document, key, language)) return document
  const next = structuredClone(document)
  if (key === "contact.heading") { next.contact.heading[language] = value; return next }
  if (key === "contact.body") { next.contact.body[language] = value; return next }
  if (key === "brands.promotion_image_url") { next.brands.promotion_image_url = value || null; return next }
  if (key.startsWith("brands.")) {
    const name = key.slice(7) as "heading" | "subheading" | "search_placeholder" | "explore_label" | "view_all_label" | "promotion_heading" | "promotion_subheading"
    next.brands[name] = { ar: next.brands[name]?.ar ?? value, en: next.brands[name]?.en ?? value, [language]: value }
    return next
  }
  if (key.startsWith("shop.")) {
    next.shop ??= structuredClone(urbxShopDefaults)
    next.shop[key.slice(5) as keyof typeof next.shop][language] = value
    return next
  }
  if (key.startsWith("home.") && next.template_key === "urbx" && !next.home) next.home = structuredClone(urbxHomeDefaults)
  if (key.startsWith("home.") && next.template_key === "template-6" && !next.home) next.home = structuredClone(template6HomeDefaults)
  if (key.startsWith("home.") && next.home) {
    const property = key.slice(5) as keyof typeof next.home;
    if (property === "image_url" || property === "promotion_image_url") next.home[property] = value;
    else next.home[property][language] = value;
    return next;
  }
  if (key === "about.title") { next.about.title[language] = value; return next }
  const benefitMatch = /^benefit\.([a-z0-9-]+)\.(title|subtitle)$/.exec(key)
  if (benefitMatch) {
    next.hero.benefits.find(item => item.id === benefitMatch[1])![benefitMatch[2] as "title" | "subtitle"][language] = value
    return next
  }
  if (key === "hero.image" || key === "offer.image") {
    const index = key === "hero.image" ? 0 : 1
    const slide = next.hero.slides.filter(item => item.enabled)[index]
    if (slide) slide.image_url = value
    else next.hero.slides.push({ id: `glow-inline-${crypto.randomUUID()}`, image_url: value,
      alt: { ar: index ? "صورة العرض" : "صورة الواجهة", en: index ? "Special offer" : "Beauty collection" }, enabled: true })
    if (!index) next.hero.image_url = value
  } else if (key.startsWith("hero.")) {
    const name = key.slice(5) as "heading" | "eyebrow" | "subheading" | "cta_label"
    next.hero[name][language] = value
    if (name === "cta_label") {
      const button = next.hero.buttons.find(item => item.enabled)
      if (button) button.label[language] = value
    }
  } else if (key.startsWith("category.")) {
    const [, slug, property] = key.split(".")
    const brand = next.brands.items.find(item => item.slug === slug)!
    if (property === "image") brand.image_url = value
    else if (property === "banner") brand.banner_image_url = value
    else brand.name[language] = value
  } else {
    next.navigation.items.find(item => item.key === key.slice(11))!.label[language] = value
  }
  return next
}

export function GlowContentDialog({ field, onApply, onClose }: {
  field: GlowContentField; onApply: (value: string) => void; onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [value, setValue] = useState(field.value)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    return () => { ref.current?.close(); previous?.focus() }
  }, [])
  const apply = () => {
    const result = value.trim()
    if (!result || result.length > field.maximum || /[<>\u0000-\u001f\u007f]/u.test(result)) {
      setError(`Enter plain content up to ${field.maximum} characters.`); return
    }
    if (field.image) {
      const local = /^\/(?!\/)/.test(result) && !/[\\\s]/.test(result) && !result.includes("..")
      let remote = false
      try { const url = new URL(result); remote = url.protocol === "https:" && !url.username && !url.password } catch { /* A local asset path is also allowed. */ }
      if (!local && !remote) { setError("Use an uploaded image, an HTTPS image URL, or a local /assets/ path."); return }
    }
    onApply(result)
  }
  return createPortal(<dialog className="glow-content-dialog" ref={ref} aria-labelledby="glow-content-title"
    onCancel={event => { event.preventDefault(); if (!uploading) onClose() }}>
    <form onSubmit={event => { event.preventDefault(); apply() }}>
      <header><h2 id="glow-content-title">{field.label}</h2><button type="button" disabled={uploading} aria-label="Close content editor" onClick={onClose}>×</button></header>
      <p>Only this content changes. The original design stays in place.</p>
      <label><span>{field.image ? "Image URL" : "Text"}</span>
        <textarea autoFocus rows={field.image ? 3 : 4} value={value} maxLength={field.maximum} disabled={uploading} onChange={event => { setValue(event.target.value); setError("") }} />
      </label>
      {field.image && <label className="glow-content-dialog__upload">Upload image
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async event => {
          const file = event.target.files?.[0]
          if (!file) return
          if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { setError("Choose a JPG, PNG or WebP image under 2 MB."); return }
          setUploading(true); setError("")
          try { setValue(await uploadPlatformImage(file)) } catch { setError("Image upload failed. Please try again.") } finally { setUploading(false) }
        }} />
      </label>}
      {error && <p role="alert">{error}</p>}
      <footer><button type="button" disabled={uploading} onClick={onClose}>Cancel</button><button className="is-primary" disabled={uploading} type="submit">{uploading ? "Uploading…" : "Apply to preview"}</button></footer>
    </form>
  </dialog>, document.body)
}
