import { describe, expect, it } from "vitest"

import { createStorefrontTemplatePreview } from "./storefront-template-preview-data"
import type { PlatformStorefrontTemplateKey } from "./types"

const templateKeys: PlatformStorefrontTemplateKey[] = [
  "luxe-commerce",
  "luxe-commerce-full",
  "modern-market",
  "home-living",
  "standard",
  "glow-beauty",
]

describe("storefront template preview data", () => {
  it.each(templateKeys)("provides a complete mock catalog for %s", (templateKey) => {
    const preview = createStorefrontTemplatePreview(templateKey)

    expect(preview.template_key).toBe(templateKey)
    expect(preview.is_mock).toBe(true)
    expect(preview.hero.heading.length).toBeGreaterThan(0)
    expect(preview.hero.image_url).toMatch(/^\/assets\/admin\//)
    expect(preview.products).toHaveLength(templateKey === "glow-beauty" ? 6 : 4)
    expect(preview.product_count).toBe(preview.products.length)
    expect(preview.products.every((product) => product.thumbnail_url && product.price_lyd)).toBe(true)
    if (templateKey === "glow-beauty") {
      expect(preview.products.map((product) => product.thumbnail_url)).toEqual([
        "/assets/glow-beauty/product-radiance-serum.png",
        "/assets/glow-beauty/product-hydra-moisturizer.png",
        "/assets/glow-beauty/product-matte-lipstick.png",
        "/assets/glow-beauty/product-rose-eau-de-parfum-wishlist.png",
        "/assets/glow-beauty/product-glow-foundation.png",
        "/assets/glow-beauty/product-luxe-face-cream.png",
      ])
    }
  })

  it("returns fresh data so preview interactions cannot mutate future previews", () => {
    const first = createStorefrontTemplatePreview("luxe-commerce")
    first.products[0].title = "Changed in the browser"

    const second = createStorefrontTemplatePreview("luxe-commerce")
    expect(second.products[0].title).not.toBe("Changed in the browser")
  })
})
