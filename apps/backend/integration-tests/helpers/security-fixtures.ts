import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { hashVendorPassword } from "../../src/api/_utils/vendor-auth";
import { MARKETPLACE_MODULE } from "../../src/modules/marketplace";
import type MarketplaceModuleService from "../../src/modules/marketplace/service";
import { storeProfileStoreLinkDefinition } from "../../src/api/_utils/legacy-vendor-compatibility";
import { SAAS_MODULE } from "../../src/modules/saas";
import type SaasModuleService from "../../src/modules/saas/service";

export type SecurityFixtures = Awaited<
  ReturnType<typeof createSecurityFixtures>
>;

export const createSecurityFixtures = async (container: MedusaContainer) => {
  const { result: salesChannels } = await createSalesChannelsWorkflow(
    container,
  ).run({
    input: {
      salesChannelsData: [
        { name: "Phase 0.5 Sales Channel A" },
        { name: "Phase 0.5 Sales Channel B" },
      ],
    },
  });
  const [salesChannelA, salesChannelB] = salesChannels;

  const { result: apiKeys } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Phase 0.5 Storefront A",
          type: "publishable",
          created_by: "",
        },
        {
          title: "Phase 0.5 Storefront B",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });
  const [apiKeyA, apiKeyB] = apiKeys;

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKeyA.id, add: [salesChannelA.id] },
  });
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKeyB.id, add: [salesChannelB.id] },
  });

  await createShippingProfilesWorkflow(container).run({
    input: {
      data: [{ name: "Phase 0.5 Default", type: "default" }],
    },
  });

  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Phase 0.5 Commerce Region A",
          currency_code: "lyd",
          countries: ["ly"],
          payment_providers: ["pp_system_default"],
        },
        {
          name: "Phase 0.5 Commerce Region B",
          currency_code: "lyd",
          countries: ["tn"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const [regionA, regionB] = regions;

  const marketplace = container.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceModuleService;
  const vendorA = await marketplace.createVendors({
    name: "Phase 0.5 Store A",
    handle: "phase-05-store-a",
    status: "active",
    contact_email: "private-a@example.test",
    logo_url: "https://cdn.example.test/store-a.png",
    primary_color: "#1257a6",
    metadata: {
      sales_channel_id: salesChannelA.id,
      publishable_api_key_id: apiKeyA.id,
      internal_note: "must never be public",
    },
  } as any);
  const vendorB = await marketplace.createVendors({
    name: "Phase 0.5 Store B",
    handle: "phase-05-store-b",
    status: "active",
    contact_email: "private-b@example.test",
    metadata: {
      sales_channel_id: salesChannelB.id,
      publishable_api_key_id: apiKeyB.id,
    },
  } as any);
  const passwordA = "Merchant-A-Strong-Passphrase";
  const passwordB = "Merchant-B-Strong-Passphrase";
  const memberA = await marketplace.createVendorMembers({
    vendor_id: vendorA.id,
    email: "merchant-a@example.test",
    role: "owner",
    status: "active",
    metadata: {
      password_hash: await hashVendorPassword(passwordA),
      session_version: 0,
    },
  } as any);
  const memberB = await marketplace.createVendorMembers({
    vendor_id: vendorB.id,
    email: "merchant-b@example.test",
    role: "owner",
    status: "active",
    metadata: {
      password_hash: await hashVendorPassword(passwordB),
      session_version: 0,
    },
  } as any);

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
  ] as any);

  const saas = container.resolve(SAAS_MODULE) as SaasModuleService;
  const storeService = container.resolve(Modules.STORE) as any;
  const tenantA = await saas.createTenants({
    name: "Phase 2A Tenant A",
    status: "active",
  } as any);
  const tenantB = await saas.createTenants({
    name: "Phase 2A Tenant B",
    status: "active",
  } as any);
  const storeProfileA = await saas.createStoreProfiles({
    tenant_id: tenantA.id,
    legacy_vendor_id: vendorA.id,
    handle: vendorA.handle,
    status: "active",
    locale: "ar-LY",
    timezone: "Africa/Tripoli",
    plan_code: "professional_commerce",
  } as any);
  const storeProfileB = await saas.createStoreProfiles({
    tenant_id: tenantB.id,
    legacy_vendor_id: vendorB.id,
    handle: vendorB.handle,
    status: "active",
    locale: "ar-LY",
    timezone: "Africa/Tripoli",
    plan_code: "professional_commerce",
  } as any);
  const medusaStoreA = await storeService.createStores({
    name: vendorA.name,
    default_sales_channel_id: salesChannelA.id,
    default_region_id: regionA.id,
    supported_currencies: [{ currency_code: "lyd", is_default: true }],
    metadata: { saas_allowed_region_ids: [regionA.id] },
  });
  const medusaStoreB = await storeService.createStores({
    name: vendorB.name,
    default_sales_channel_id: salesChannelB.id,
    default_region_id: regionB.id,
    supported_currencies: [{ currency_code: "lyd", is_default: true }],
    metadata: { saas_allowed_region_ids: [regionB.id] },
  });
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any;

  await link.create([
    storeProfileStoreLinkDefinition(storeProfileA.id, medusaStoreA.id),
    storeProfileStoreLinkDefinition(storeProfileB.id, medusaStoreB.id),
  ]);
  await saas.createStoreDomains([
    {
      store_profile_id: storeProfileA.id,
      normalized_hostname: "store-a.example.test",
      original_hostname: "store-a.example.test",
      type: "custom",
      verification_status: "verified",
      ssl_status: "active",
      is_primary: true,
    },
    {
      store_profile_id: storeProfileB.id,
      normalized_hostname: "store-b.example.test",
      original_hostname: "store-b.example.test",
      type: "custom",
      verification_status: "verified",
      ssl_status: "active",
      is_primary: true,
    },
  ] as any);
  await saas.createStoreBrands({
    store_profile_id: storeProfileA.id,
    logo_url: vendorA.logo_url,
    primary_color: vendorA.primary_color,
  } as any);
  const membershipA = await saas.createMerchantMemberships({
    store_profile_id: storeProfileA.id,
    merchant_account_reference: memberA.id,
    role: "owner",
    status: "active",
  } as any);
  const membershipB = await saas.createMerchantMemberships({
    store_profile_id: storeProfileB.id,
    merchant_account_reference: memberB.id,
    role: "owner",
    status: "active",
  } as any);
  return {
    marketplace,
    vendorA,
    vendorB,
    memberA,
    memberB,
    membershipA,
    membershipB,
    tenantA,
    tenantB,
    storeProfileA,
    storeProfileB,
    medusaStoreA,
    medusaStoreB,
    regionA,
    regionB,
    salesChannelA,
    salesChannelB,
    apiKeyA,
    apiKeyB,
    passwordA,
    passwordB,
  };
};
