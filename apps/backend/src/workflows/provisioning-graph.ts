import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { listStoreProfileStoreLinks } from "../api/_utils/legacy-vendor-compatibility";
import { resolveMerchantStoreContext } from "../api/_utils/merchant-store-context";
import { resolvePublicStoreContext } from "../api/_utils/public-store-context";
import { getVendorSessionVersion } from "../api/_utils/vendor-auth";
import {
  temporaryDomainForHandle,
  type ProvisionStoreInput,
} from "./provisioning-contract";
import {
  provisioningInvalid,
  provisioningServices,
  requiredProvisioningId,
  type ProvisioningRecord,
} from "./provisioning-state";

const listLinkRecords = async (
  container: MedusaContainer,
  leftModule: string,
  leftField: string,
  rightModule: string,
  rightField: string,
  filters: Record<string, unknown>,
): Promise<Record<string, any>[]> => {
  const { link } = provisioningServices(container);
  const linkModule = link.getLinkModule(
    leftModule,
    leftField,
    rightModule,
    rightField,
  );

  if (!linkModule) {
    throw provisioningInvalid(
      "A required ownership link module is unavailable.",
    );
  }

  return await linkModule.list(filters);
};

export const validateProvisioningStructure = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<{ key: Record<string, any>; member: Record<string, any> }> => {
  const { saas, marketplace, store, region, stockLocation, apiKey } =
    provisioningServices(container);
  const tenantId = requiredProvisioningId(record, "tenant_id");
  const profileId = requiredProvisioningId(record, "store_profile_id");
  const storeId = requiredProvisioningId(record, "medusa_store_id");
  const channelId = requiredProvisioningId(record, "sales_channel_id");
  const keyId = requiredProvisioningId(record, "publishable_api_key_id");
  const regionId = requiredProvisioningId(record, "region_id");
  const locationId = requiredProvisioningId(record, "stock_location_id");
  const accountId = requiredProvisioningId(
    record,
    "merchant_account_reference",
  );
  const membershipId = requiredProvisioningId(record, "merchant_membership_id");
  const vendorId = requiredProvisioningId(record, "legacy_vendor_id");

  const [
    tenant,
    profile,
    medusaStore,
    provisionedRegion,
    location,
    key,
    member,
    vendor,
    domains,
    brands,
    memberships,
    profileLinks,
    keyLinks,
    locationLinks,
  ] = await Promise.all([
    saas.retrieveTenant(tenantId),
    saas.retrieveStoreProfile(profileId),
    store.retrieveStore(storeId),
    region.retrieveRegion(regionId),
    stockLocation.retrieveStockLocation(locationId),
    apiKey.retrieveApiKey(keyId),
    marketplace.retrieveVendorMember(accountId),
    marketplace.retrieveVendor(vendorId),
    saas.listStoreDomains({ store_profile_id: profileId }),
    saas.listStoreBrands({ store_profile_id: profileId }),
    saas.listMerchantMemberships({ store_profile_id: profileId }),
    listStoreProfileStoreLinks(container, { store_profile_id: profileId }),
    listLinkRecords(
      container,
      Modules.API_KEY,
      "publishable_key_id",
      Modules.SALES_CHANNEL,
      "sales_channel_id",
      { publishable_key_id: keyId },
    ),
    listLinkRecords(
      container,
      Modules.SALES_CHANNEL,
      "sales_channel_id",
      Modules.STOCK_LOCATION,
      "stock_location_id",
      { stock_location_id: locationId },
    ),
  ]);
  const allStoreProfileLinks = await listStoreProfileStoreLinks(container, {
    store_id: storeId,
  });

  const graphValid =
    tenant.status === "active" &&
    profile.status === "draft" &&
    profile.tenant_id === tenantId &&
    profile.plan_code === request.store.plan_code &&
    profile.legacy_vendor_id === vendorId &&
    profileLinks.length === 1 &&
    allStoreProfileLinks.length === 1 &&
    profileLinks[0].store_id === storeId &&
    medusaStore.default_sales_channel_id === channelId &&
    medusaStore.default_region_id === regionId &&
    medusaStore.default_location_id === locationId &&
    provisionedRegion.currency_code === request.store.currency_code &&
    key.type === "publishable" &&
    !key.revoked_at &&
    keyLinks.length === 1 &&
    keyLinks[0].sales_channel_id === channelId &&
    locationLinks.length === 1 &&
    locationLinks[0].sales_channel_id === channelId &&
    Boolean(location.id) &&
    domains.filter((domain: any) => domain.type === "temporary").length === 1 &&
    domains.some(
      (domain: any) =>
        domain.type === "temporary" &&
        domain.verification_status === "verified" &&
        domain.is_primary,
    ) &&
    brands.length === 1 &&
    memberships.length === 1 &&
    memberships[0].id === membershipId &&
    memberships[0].merchant_account_reference === member.id &&
    memberships[0].role === "owner" &&
    memberships[0].status === "active" &&
    member.status === "active" &&
    vendor.status === "draft" &&
    vendor.handle === request.store.handle;

  if (!graphValid) {
    throw provisioningInvalid(
      "The provisioned Store graph failed an invariant.",
    );
  }

  const ownershipLinks = [
    [Modules.STORE, "store_id", Modules.PRODUCT, "product_id"],
    [Modules.STORE, "store_id", Modules.CART, "cart_id"],
    [Modules.STORE, "store_id", Modules.ORDER, "order_id"],
  ];

  for (const [
    leftModule,
    leftField,
    rightModule,
    rightField,
  ] of ownershipLinks) {
    const linkModule = provisioningServices(container).link.getLinkModule(
      leftModule,
      leftField,
      rightModule,
      rightField,
    );
    if (!linkModule) {
      throw provisioningInvalid(
        "Commerce ownership compatibility is unavailable.",
      );
    }
  }

  return { key, member };
};

export const validateProvisioningContexts = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
  key: Record<string, any>,
  member: Record<string, any>,
) => {
  const publicRequest = {
    scope: container,
    headers: {
      host: temporaryDomainForHandle(request.store.handle),
    },
    publishable_key_context: {
      key: key.token,
      sales_channel_ids: [requiredProvisioningId(record, "sales_channel_id")],
    },
  } as any;
  const merchantRequest = {
    scope: container,
    vendor_auth: {
      member_id: member.id,
      vendor_id: requiredProvisioningId(record, "legacy_vendor_id"),
      store_profile_id: requiredProvisioningId(record, "store_profile_id"),
      session_version: getVendorSessionVersion(member.metadata),
    },
  } as any;

  const [publicContext, merchantContext] = await Promise.all([
    resolvePublicStoreContext(publicRequest),
    resolveMerchantStoreContext(merchantRequest),
  ]);

  if (
    publicContext.medusaStoreId !== record.medusa_store_id ||
    merchantContext.medusaStoreId !== record.medusa_store_id ||
    merchantContext.merchantMemberId !== member.id
  ) {
    throw provisioningInvalid("Provisioned Store contexts do not agree.");
  }
};
