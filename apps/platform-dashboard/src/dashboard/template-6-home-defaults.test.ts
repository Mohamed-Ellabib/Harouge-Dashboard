import { describe, expect, it } from "vitest"
import { applyGlowContent, glowContentField } from "./components/GlowContentDialog"
import { template6HomeDefaults } from "./template-6-home-defaults"
import type { PlatformStorefrontDocument } from "./types"

describe("Template 6 inline home compatibility", () => {
  it("initializes old drafts independently and refuses arbitrary fields", () => {
    const document = { template_key: "template-6", hero: { heading: { en: "Welcome", ar: "أهلاً" } } } as PlatformStorefrontDocument
    expect(glowContentField(document, "home.heading")?.value).toBe(template6HomeDefaults.heading.en)
    const edited = applyGlowContent(document, "home.heading", "MY SHOP")
    expect(edited.home?.heading.en).toBe("MY SHOP")
    expect(edited.home?.heading.ar).toBe(template6HomeDefaults.heading.ar)
    expect(edited.hero.heading).toEqual(document.hero.heading)
    expect(document.home).toBeUndefined()
    // Unknown input is not interpreted as an arbitrary property path.
    const complete = { ...edited, brands: { items: [] }, navigation: { items: [] } } as unknown as PlatformStorefrontDocument
    expect(glowContentField(complete, "home.__proto__")).toBeNull()
  })
})
