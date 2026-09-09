import type { MedusaContainer } from "@medusajs/framework/types";

import {
  hashVendorPassword,
} from "../api/_utils/vendor-auth";
import { hasActiveMerchantAccountCredential } from "../api/_utils/merchant-account-credentials";
import { normalizeDomain, normalizeEmail } from "../api/_utils/vendors";
import { ensureDefaultStorefrontDocument } from "../modules/saas/platform-storefront-document";
import {
  entitlementsForPlan,
  temporaryDomainForHandle,
  type ProvisionStoreInput,
} from "./provisioning-contract";
import {
  checkpointProvisioningResource,
  provisioningConflict,
  provisioningInvalid,
  provisioningServices,
  recordProvisioningEvent,
  requiredProvisioningId,
  resourceStateFor,
  updateProvisioningRecord,
  type ProvisioningRecord,
} from "./provisioning-state";

export const ensureProvisioningBrand = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  const { saas } = provisioningServices(container);
  const profileId = requiredProvisioningId(record, "store_profile_id");

  await ensureDefaultStorefrontDocument(
    container,
    profileId,
    typeof record.actor_id === "string" ? record.actor_id : null,
  );

  if (record.store_brand_id) {
    await saas.retrieveStoreBrand(record.store_brand_id);
    return record;
  }

  const brand = await saas.createStoreBrands({
    store_profile_id: profileId,
    logo_url: request.brand.logo_url ?? null,
    favicon_url: request.brand.favicon_url ?? null,
    primary_color: request.brand.primary_color ?? null,
    secondary_color: request.brand.secondary_color ?? null,
    typography_key: request.brand.typography_key ?? null,
    configuration: {
      entitlements: entitlementsForPlan(request.store.plan_code),
    },
  });

  return await checkpointProvisioningResource(
    container,
    record,
    "brand",
    "store_brand",
    brand.id,
    "created",
    { store_brand_id: brand.id },
  );
};

export const ensureProvisioningDomains = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  const { saas } = provisioningServices(container);
  const profileId = requiredProvisioningId(record, "store_profile_id");
  const temporaryDomain = temporaryDomainForHandle(request.store.handle);
  let current = record;

  if (!current.store_domain_id) {
    const domain = await saas.createStoreDomains({
      store_profile_id: profileId,
      normalized_hostname: temporaryDomain,
      original_hostname: temporaryDomain,
      type: "temporary",
      verification_status: "verified",
      ssl_status: "pending",
      is_primary: true,
    });

    current = await checkpointProvisioningResource(
      container,
      current,
      "domain",
      "temporary_domain",
      domain.id,
      "created",
      { store_domain_id: domain.id },
    );
  }

  if (request.domain.custom_hostname) {
    const normalized = normalizeDomain(request.domain.custom_hostname);
    const domains = await saas.listStoreDomains({
      store_profile_id: profileId,
      normalized_hostname: normalized,
    });

    if (!domains.length) {
      const custom = await saas.createStoreDomains({
        store_profile_id: profileId,
        normalized_hostname: normalized,
        original_hostname: request.domain.custom_hostname,
        type: "custom",
        verification_status: "pending",
        ssl_status: "pending",
        is_primary: false,
      });
      const state = resourceStateFor(current);
      state.custom_domain = { id: custom.id, disposition: "created" };
      current = await updateProvisioningRecord(container, current, {
        resource_state: state,
        current_step: "domain",
      });
      await recordProvisioningEvent(
        container,
        current,
        "step_completed",
        "domain",
        {
          resource: "custom_domain",
          resource_id: custom.id,
        },
      );
    }
  }

  return current;
};

const ensureLegacyDomains = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  vendorId: string,
) => {
  const { saas, marketplace } = provisioningServices(container);
  const permanentDomains = await saas.listStoreDomains({
    store_profile_id: requiredProvisioningId(record, "store_profile_id"),
  });
  const legacyDomains = await marketplace.listVendorDomains({
    vendor_id: vendorId,
  });

  for (const permanentDomain of permanentDomains) {
    if (
      !legacyDomains.some(
        (entry: any) => entry.domain === permanentDomain.normalized_hostname,
      )
    ) {
      await marketplace.createVendorDomains({
        domain: permanentDomain.normalized_hostname,
        is_primary: Boolean(permanentDomain.is_primary),
        vendor_id: vendorId,
      });
    }
  }
};

const ensureLegacyStore = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<{ record: ProvisioningRecord; vendor: Record<string, any> }> => {
  const { marketplace, saas } = provisioningServices(container);

  if (record.legacy_vendor_id) {
    const vendor = await marketplace.retrieveVendor(record.legacy_vendor_id);
    await ensureLegacyDomains(container, record, vendor.id);
    return { record, vendor };
  }

  const existingVendors = await marketplace.listVendors({
    handle: request.store.handle,
  });

  if (existingVendors.length) {
    throw provisioningConflict(
      "The legacy Store compatibility handle already exists.",
    );
  }

  const vendor = await marketplace.createVendors({
    name: request.store.name,
    handle: request.store.handle,
    status: "draft",
    contact_email: request.contact.public_email ?? null,
    logo_url: request.brand.logo_url ?? null,
    primary_color: request.brand.primary_color ?? null,
    metadata: {
      saas_provisioning_id: record.id,
      medusa_store_id: requiredProvisioningId(record, "medusa_store_id"),
      sales_channel_id: requiredProvisioningId(record, "sales_channel_id"),
      publishable_api_key_id: requiredProvisioningId(
        record,
        "publishable_api_key_id",
      ),
      region_id: requiredProvisioningId(record, "region_id"),
      stock_location_id: requiredProvisioningId(record, "stock_location_id"),
    },
  });

  await saas.updateStoreProfiles({
    id: requiredProvisioningId(record, "store_profile_id"),
    legacy_vendor_id: vendor.id,
  });

  const current = await checkpointProvisioningResource(
    container,
    record,
    "merchant_account",
    "legacy_vendor",
    vendor.id,
    "created",
    { legacy_vendor_id: vendor.id },
  );
  await ensureLegacyDomains(container, current, vendor.id);
  return { record: current, vendor };
};

export const ensureProvisioningMerchantAccount = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  const { marketplace } = provisioningServices(container);
  const legacy = await ensureLegacyStore(container, record, request);
  let current = legacy.record;
  const members: Record<string, any>[] = [];
  let skip = 0;

  while (true) {
    const page = await marketplace.listVendorMembers({}, { skip, take: 250 });
    members.push(...page);

    if (page.length < 250) {
      break;
    }

    skip += page.length;
  }
  const exactMembers = members.filter(
    (member: any) => normalizeEmail(member.email) === request.owner.email,
  );

  if (current.merchant_account_reference) {
    if (
      exactMembers.length !== 1 ||
      exactMembers[0].id !== current.merchant_account_reference ||
      !hasActiveMerchantAccountCredential(exactMembers[0])
    ) {
      throw provisioningConflict(
        "The retained merchant account is unavailable or ambiguous.",
      );
    }

    return current;
  }

  if (request.owner.reuse_existing_account) {
    if (
      exactMembers.length !== 1 ||
      !hasActiveMerchantAccountCredential(exactMembers[0])
    ) {
      throw provisioningConflict(
        "The reusable merchant account is unavailable or ambiguous.",
      );
    }

    return await checkpointProvisioningResource(
      container,
      current,
      "merchant_account",
      "merchant_account",
      exactMembers[0].id,
      "reused",
      { merchant_account_reference: exactMembers[0].id },
    );
  }

  if (exactMembers.length) {
    throw provisioningConflict(
      "The merchant email already exists; explicit account reuse is required.",
    );
  }

  const password = request.owner.initial_password;
  if (!password) {
    throw provisioningInvalid(
      "An initial password is required for the new merchant owner.",
    );
  }

  const member = await marketplace.createVendorMembers({
    vendor_id: legacy.vendor.id,
    user_id: null,
    email: request.owner.email,
    role: "owner",
    status: "active",
    metadata: {
      display_name: request.owner.display_name ?? null,
      password_hash: await hashVendorPassword(password),
      password_change_required: true,
      session_version: 0,
    },
  });

  current = await checkpointProvisioningResource(
    container,
    current,
    "merchant_account",
    "merchant_account",
    member.id,
    "created",
    { merchant_account_reference: member.id },
  );
  return current;
};

export const ensureProvisioningMembership = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
): Promise<ProvisioningRecord> => {
  const { saas } = provisioningServices(container);

  if (record.merchant_membership_id) {
    await saas.retrieveMerchantMembership(record.merchant_membership_id);
    return record;
  }

  const profileId = requiredProvisioningId(record, "store_profile_id");
  const accountId = requiredProvisioningId(
    record,
    "merchant_account_reference",
  );
  const existing = await saas.listMerchantMemberships({
    store_profile_id: profileId,
    merchant_account_reference: accountId,
  });

  if (existing.length === 1) {
    return await checkpointProvisioningResource(
      container,
      record,
      "membership",
      "merchant_membership",
      existing[0].id,
      "reused",
      { merchant_membership_id: existing[0].id },
    );
  }
  if (existing.length > 1) {
    throw provisioningConflict("The merchant owner membership is ambiguous.");
  }

  const membership = await saas.createMerchantMemberships({
    store_profile_id: profileId,
    merchant_account_reference: accountId,
    role: "owner",
    status: "active",
  });

  return await checkpointProvisioningResource(
    container,
    record,
    "membership",
    "merchant_membership",
    membership.id,
    "created",
    { merchant_membership_id: membership.id },
  );
};
