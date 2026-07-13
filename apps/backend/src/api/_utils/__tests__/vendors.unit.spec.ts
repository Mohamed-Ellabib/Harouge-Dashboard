import { Modules } from "@medusajs/framework/utils"

import {
  assertProductBelongsExclusivelyToVendor,
  listExclusivelyOwnedProductIds,
  normalizeDomain,
  parseDomains,
  resolveVendorSalesChannel,
  serializePublicStoreProfile,
} from "../vendors"

describe("vendor store boundaries", () => {
  it("serializes an exact public allowlist", () => {
    const profile = serializePublicStoreProfile(
      {
        id: "vendor_internal",
        name: "Store A",
        handle: "store-a",
        status: "active",
        contact_email: "private@example.test",
        logo_url: "https://example.test/logo.png",
        primary_color: "#112233",
        metadata: {
          password_hash: "must-not-leak",
          session_version: 9,
          sales_channel_id: "sc_a",
          future_private_field: "must-not-leak",
        },
        created_at: new Date(),
        updated_at: new Date(),
      },
      [
        { domain: "secondary.example.test", is_primary: false },
        { domain: "store-a.example.test", is_primary: true },
      ]
    )

    expect(Object.keys(profile).sort()).toEqual([
      "branding",
      "domain",
      "handle",
      "name",
    ])
    expect(profile).toEqual({
      name: "Store A",
      handle: "store-a",
      domain: "store-a.example.test",
      branding: {
        logo_url: "https://example.test/logo.png",
        primary_color: "#112233",
      },
    })
    expect(JSON.stringify(profile)).not.toMatch(
      /password_hash|session_version|vendor_internal|private@example|future_private_field|sc_a/
    )
  })

  it("uses the vendor's configured sales channel", async () => {
    const listSalesChannels = jest.fn().mockResolvedValue([{ id: "sc_a" }])
    const req = {
      scope: {
        resolve: jest.fn((name) =>
          name === Modules.SALES_CHANNEL ? { listSalesChannels } : null
        ),
      },
    } as any

    await expect(
      resolveVendorSalesChannel(req, {
        metadata: { sales_channel_id: "sc_a" },
      })
    ).resolves.toEqual({ id: "sc_a" })
    expect(listSalesChannels).toHaveBeenCalledWith(
      { id: ["sc_a"] },
      { take: 1 }
    )
  })

  it("fails closed when the channel is not explicitly configured", async () => {
    const listSalesChannels = jest.fn()
    const req = {
      scope: { resolve: jest.fn(() => ({ listSalesChannels })) },
    } as any

    await expect(resolveVendorSalesChannel(req, { metadata: null })).rejects.toThrow(
      "must be configured explicitly"
    )
    expect(listSalesChannels).not.toHaveBeenCalled()
  })

  it("refuses ambiguous channel ownership", async () => {
    const req = {
      scope: {
        resolve: jest.fn(() => ({
          listSalesChannels: jest
            .fn()
            .mockResolvedValue([{ id: "sc_a" }, { id: "sc_b" }]),
        })),
      },
    } as any

    await expect(
      resolveVendorSalesChannel(req, { metadata: null })
    ).rejects.toThrow("must be configured")
  })

  it("normalizes equivalent domains and removes ports, paths, www, and trailing dots", () => {
    expect(normalizeDomain(" HTTPS://WWW.Store-A.Example.Test:8443/path. ")).toBe(
      "store-a.example.test"
    )
    expect(parseDomains([
      "store-a.example.test",
      "STORE-A.EXAMPLE.TEST.",
      "https://www.store-a.example.test:443/catalog",
    ])).toEqual(["store-a.example.test"])
  })

  it("excludes ambiguous product ownership and rejects direct access", async () => {
    const links = [
      { vendor_id: "vendor_a", product_id: "product_a" },
      { vendor_id: "vendor_b", product_id: "product_b" },
      { vendor_id: "vendor_a", product_id: "product_ambiguous" },
      { vendor_id: "vendor_b", product_id: "product_ambiguous" },
    ]
    const linkModule = {
      list: jest.fn((filters = {}) =>
        Promise.resolve(
          "product_id" in filters
            ? links.filter((link) => link.product_id === (filters as any).product_id)
            : links
        )
      ),
    }
    const req = {
      scope: {
        resolve: jest.fn(() => ({ getLinkModule: () => linkModule })),
      },
    } as any

    await expect(listExclusivelyOwnedProductIds(req, "vendor_a")).resolves.toEqual([
      "product_a",
    ])
    await expect(
      assertProductBelongsExclusivelyToVendor(req, "vendor_a", "product_a")
    ).resolves.toBeUndefined()
    await expect(
      assertProductBelongsExclusivelyToVendor(req, "vendor_a", "product_ambiguous")
    ).rejects.toThrow("Product was not found")
    await expect(
      assertProductBelongsExclusivelyToVendor(req, "vendor_a", "product_b")
    ).rejects.toThrow("Product was not found")
  })
})
