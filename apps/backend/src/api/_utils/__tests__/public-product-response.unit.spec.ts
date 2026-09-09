import { sanitizePublicProductResponse } from "../public-product-response"

describe("public product response boundary", () => {
  it("derives only bounded Storefront presentation fields and strips metadata recursively", () => {
    const sanitized = sanitizePublicProductResponse({
      products: [{
        id: "prod_internal",
        handle: "radiance-serum",
        title: "Radiance Serum",
        storefront_category: "spoofed",
        metadata: {
          labibtech_storefront_category: "Skincare",
          labibtech_storefront_badge: "BEST SELLER",
          labibtech_storefront_compare_at_price_lyd: 160,
          tenant_secret: "never-public",
        },
        variants: [{
          id: "variant_public_reference",
          metadata: { inventory_secret: "never-public" },
        }],
      }],
    }) as any

    expect(sanitized.products[0]).toMatchObject({
      handle: "radiance-serum",
      title: "Radiance Serum",
      storefront_category: "Skincare",
      storefront_badge: "BEST SELLER",
      storefront_compare_at_price_lyd: 160,
    })
    expect(JSON.stringify(sanitized)).not.toMatch(
      /metadata|tenant_secret|inventory_secret|never-public|spoofed/,
    )
  })

  it("drops malformed presentation metadata instead of reflecting it", () => {
    const sanitized = sanitizePublicProductResponse({
      handle: "unsafe-product",
      title: "Unsafe",
      metadata: {
        labibtech_storefront_category: "<script>",
        labibtech_storefront_badge: "x".repeat(41),
        labibtech_storefront_compare_at_price_lyd: Number.POSITIVE_INFINITY,
      },
    }) as any

    expect(sanitized).toEqual({ handle: "unsafe-product", title: "Unsafe" })
  })
})
