import { describe, expect, it } from "vitest"
import { applyGlowContent, glowContentField } from "./GlowContentDialog"
import type { PlatformStorefrontDocument } from "../types"

const fixture = () => ({
  template_key: "luxe-commerce-full",
  hero: {
    heading: { ar: "عنوان", en: "Heading" },
    cta_label: { ar: "تسوق", en: "Shop" },
    buttons: [{ enabled: true, label: { ar: "تسوق", en: "Shop" } }],
    benefits: [],
  },
  brands: { heading: { ar: "علامات", en: "Brands" }, items: [] },
  navigation: { items: [] },
}) as unknown as PlatformStorefrontDocument

describe("Inline content language", () => {
  it("reads and edits Arabic preview content without changing English or the source", () => {
    const source = fixture()
    expect(glowContentField(source, "hero.heading", "ar")?.value).toBe("عنوان")
    const edited = applyGlowContent(source, "hero.heading", "عنوان جديد", "ar")
    expect(edited.hero.heading).toEqual({ ar: "عنوان جديد", en: "Heading" })
    expect(source.hero.heading.ar).toBe("عنوان")
    const category = applyGlowContent(edited, "brands.heading", "علامات جديدة", "ar")
    expect(category.brands.heading).toEqual({ ar: "علامات جديدة", en: "Brands" })
  })

  it("updates the matching button translation and keeps English as the default for creation canvases", () => {
    const source = fixture()
    const edited = applyGlowContent(source, "hero.cta_label", "ابدأ التسوق", "ar")
    expect(edited.hero.buttons[0].label).toEqual({ ar: "ابدأ التسوق", en: "Shop" })
    expect(applyGlowContent(source, "hero.heading", "New heading").hero.heading)
      .toEqual({ ar: "عنوان", en: "New heading" })
  })
})
