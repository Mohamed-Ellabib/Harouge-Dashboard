import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"

import { hashVendorPassword } from "../../src/api/_utils/vendor-auth"
import { MARKETPLACE_MODULE } from "../../src/modules/marketplace"
import type MarketplaceModuleService from "../../src/modules/marketplace/service"

export type SecurityFixtures = Awaited<ReturnType<typeof createSecurityFixtures>>

export const createSecurityFixtures = async (container: MedusaContainer) => {
  const { result: salesChannels } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        { name: "Phase 0.5 Sales Channel A" },
        { name: "Phase 0.5 Sales Channel B" },
      ],
    },
  })
  const [salesChannelA, salesChannelB] = salesChannels

  const { result: apiKeys } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        { title: "Phase 0.5 Storefront A", type: "publishable", created_by: "" },
        { title: "Phase 0.5 Storefront B", type: "publishable", created_by: "" },
      ],
    },
  })
  const [apiKeyA, apiKeyB] = apiKeys

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKeyA.id, add: [salesChannelA.id] },
  })
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKeyB.id, add: [salesChannelB.id] },
  })

  await createShippingProfilesWorkflow(container).run({
    input: {
      data: [{ name: "Phase 0.5 Standard", type: "standard" }],
    },
  })

  const marketplace = container.resolve(
    MARKETPLACE_MODULE
  ) as MarketplaceModuleService
  const vendorA = await marketplace.createVendors({
    name: "Phase 0.5 Store A",
    handle: "phase-05-store-a",
    status: "active",
    contact_email: "private-a@example.test",
    logo_url: "https://cdn.example.test/store-a.png",
    primary_color: "#1257a6",
    metadata: {
      sales_channel_id: salesChannelA.id,
      internal_note: "must never be public",
    },
  } as any)
  const vendorB = await marketplace.createVendors({
    name: "Phase 0.5 Store B",
    handle: "phase-05-store-b",
    status: "active",
    contact_email: "private-b@example.test",
    metadata: {
      sales_channel_id: salesChannelB.id,
    },
  } as any)
  const passwordA = "Merchant-A-Strong-Passphrase"
  const passwordB = "Merchant-B-Strong-Passphrase"
  const memberA = await marketplace.createVendorMembers({
    vendor_id: vendorA.id,
    email: "merchant-a@example.test",
    role: "owner",
    status: "active",
    metadata: {
      password_hash: await hashVendorPassword(passwordA),
      session_version: 0,
    },
  } as any)
  const memberB = await marketplace.createVendorMembers({
    vendor_id: vendorB.id,
    email: "merchant-b@example.test",
    role: "owner",
    status: "active",
    metadata: {
      password_hash: await hashVendorPassword(passwordB),
      session_version: 0,
    },
  } as any)

  await marketplace.createVendorDomains([
    {
      vendor_id: vendorA.id,
      domain: "store-a.example.test",
      is_primary: true,
    },
    {
      vendor_id: vendorB.id,
      domain: "store-b.example.test",
      is_primary: true,
    },
  ] as any)

  return {
    marketplace,
    vendorA,
    vendorB,
    memberA,
    memberB,
    salesChannelA,
    salesChannelB,
    apiKeyA,
    apiKeyB,
    passwordA,
    passwordB,
  }
}
