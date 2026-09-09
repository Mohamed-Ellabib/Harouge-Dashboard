import { describe, expect, it } from "vitest"
import { applyGlowContent, glowContentField } from "./components/GlowContentDialog"
import type { PlatformStorefrontDocument } from "./types"

describe("Template 6 Explore editing", () => {
  const document = { template_key: "template-6", brands: { heading: { en: "EXPLORE", ar: "اكتشف" }, items: [] }, hero: { heading: { en: "Welcome", ar: "أهلاً" } }, home: { promotion_image_url: "/home.webp" }, navigation: { items: [] } } as unknown as PlatformStorefrontDocument
  it("edits independent banner text and image without changing home/welcome", () => {
    expect(glowContentField(document, "brands.promotion_heading")?.maximum).toBe(100)
    const text = applyGlowContent(document, "brands.promotion_heading", "NEW SEASON")
    const edited = applyGlowContent(text, "brands.promotion_image_url", "/new.webp")
    expect(edited.brands.promotion_heading?.en).toBe("NEW SEASON")
    expect(edited.brands.promotion_image_url).toBe("/new.webp")
    expect(edited.home).toEqual(document.home)
    expect(edited.hero).toEqual(document.hero)
    expect(applyGlowContent(edited, "brands.promotion_image_url", "").brands.promotion_image_url).toBeNull()
    expect(document.brands.promotion_image_url).toBeUndefined()
  })
  it("preserves the other language and refuses unknown property paths", () => {
    expect(applyGlowContent(document, "brands.heading", "FIND IT").brands.heading.ar).toBe("اكتشف")
    expect(glowContentField(document, "brands.__proto__")).toBeNull()
    expect(applyGlowContent(document, "brands.unapproved", "oops")).toBe(document)
  })
})
