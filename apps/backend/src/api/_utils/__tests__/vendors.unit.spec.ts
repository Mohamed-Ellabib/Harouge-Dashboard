import { Modules } from "@medusajs/framework/utils"

import {
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

  it("keeps one-channel installations compatible without selecting all", async () => {
    const req = {
      scope: {
        resolve: jest.fn(() => ({
          listSalesChannels: jest.fn().mockResolvedValue([{ id: "only_sc" }]),
        })),
      },
    } as any

    await expect(resolveVendorSalesChannel(req, { metadata: null })).resolves.toEqual(
      { id: "only_sc" }
    )
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
})
