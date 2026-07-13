import {
  createApiKeysWorkflow,
  createLinksWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import {
  listStoreProfileStoreLinks,
  storeProfileStoreLinkDefinition,
} from "../api/_utils/legacy-vendor-compatibility";
import type { ProvisionStoreInput } from "./provisioning-contract";
import {
  checkpointProvisioningResource,
  provisioningConflict,
  provisioningServices,
  requiredProvisioningId,
  withExclusiveProvisioningOperation,
  type ProvisioningRecord,
} from "./provisioning-state";

export const ensureProvisioningTenant = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  const { saas } = provisioningServices(container);

  if (record.tenant_id) {
    await saas.retrieveTenant(record.tenant_id);
    return record;
  }

  const existing = await saas.listTenants({ key: request.tenant.key });

  if (request.tenant.reuse_existing) {
    if (existing.length !== 1 || existing[0].status !== "active") {
      throw provisioningConflict(
        "The requested reusable Tenant is unavailable or ambiguous.",
      );
    }

    return await checkpointProvisioningResource(
      container,
      record,
      "tenant",
      "tenant",
      existing[0].id,
      "reused",
      { tenant_id: existing[0].id },
    );
  }

  if (existing.length) {
    throw provisioningConflict("The normalized Tenant key already exists.");
  }

  const tenant = await saas.createTenants({
    key: request.tenant.key,
    name: request.tenant.name,
    status: "active",
  });

  return await checkpointProvisioningResource(
    container,
    record,
    "tenant",
    "tenant",
    tenant.id,
    "created",
    { tenant_id: tenant.id },
  );
};

export const ensureProvisioningMedusaStore = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  const { store } = provisioningServices(container);

  if (record.medusa_store_id) {
    await store.retrieveStore(record.medusa_store_id);
    return record;
  }

  const { result } = await withExclusiveProvisioningOperation(
    container,
    "medusa-core-store-creation",
    record.id,
    () =>
      createStoresWorkflow(container).run({
        input: {
          stores: [
            {
              name: request.store.name,
              supported_currencies: [
                {
                  currency_code: request.store.currency_code,
                  is_default: true,
                },
              ],
              metadata: {
                saas_provisioning_id: record.id,
                saas_allowed_region_ids: [],
                saas_allowed_shipping_option_ids: [],
                saas_allowed_promotion_codes: [],
              },
            },
          ],
        },
      }),
  );

  return await checkpointProvisioningResource(
    container,
    record,
    "medusa_store",
    "medusa_store",
    result[0].id,
    "created",
    { medusa_store_id: result[0].id },
  );
};

export const ensureProvisioningStoreProfile = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  const { saas } = provisioningServices(container);

  if (record.store_profile_id) {
    await saas.retrieveStoreProfile(record.store_profile_id);
    const links = await listStoreProfileStoreLinks(container, {
      store_profile_id: record.store_profile_id,
    });

    if (!links.some((link) => link.store_id === record.medusa_store_id)) {
      await createLinksWorkflow(container).run({
        input: [
          storeProfileStoreLinkDefinition(
            record.store_profile_id,
            requiredProvisioningId(record, "medusa_store_id"),
          ),
        ],
      });
    }
    return record;
  }

  const profile = await saas.createStoreProfiles({
    tenant_id: requiredProvisioningId(record, "tenant_id"),
    legacy_vendor_id: null,
    handle: request.store.handle,
    status: "draft",
    locale: request.store.locale,
    timezone: request.store.timezone,
    plan_code: request.store.plan_code,
    public_contact_email: request.contact.public_email ?? null,
    public_phone: request.contact.public_phone ?? null,
    whatsapp_number: request.contact.whatsapp_number ?? null,
  });

  await createLinksWorkflow(container).run({
    input: [
      storeProfileStoreLinkDefinition(
        profile.id,
        requiredProvisioningId(record, "medusa_store_id"),
      ),
    ],
  });

  return await checkpointProvisioningResource(
    container,
    record,
    "store_profile",
    "store_profile",
    profile.id,
    "created",
    { store_profile_id: profile.id },
  );
};

export const ensureProvisioningSalesChannel = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  let current = record;

  if (!current.sales_channel_id) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: request.commerce.sales_channel_name,
            description: "Provisioned for " + request.store.handle,
            is_disabled: false,
          },
        ],
      },
    });

    current = await checkpointProvisioningResource(
      container,
      current,
      "sales_channel",
      "sales_channel",
      result[0].id,
      "created",
      { sales_channel_id: result[0].id },
    );
  }

  const storeId = requiredProvisioningId(current, "medusa_store_id");
  const channelId = requiredProvisioningId(current, "sales_channel_id");
  const { store } = provisioningServices(container);
  const medusaStore = await store.retrieveStore(storeId);

  if (medusaStore.default_sales_channel_id !== channelId) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: storeId },
        update: { default_sales_channel_id: channelId },
      },
    });
  }

  return current;
};

export const ensureProvisioningPublishableKey = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  let current = record;

  if (!current.publishable_api_key_id) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: request.store.name + " Storefront",
            type: "publishable",
            created_by: record.actor_id,
          },
        ],
      },
    });

    current = await checkpointProvisioningResource(
      container,
      current,
      "publishable_key",
      "publishable_api_key",
      result[0].id,
      "created",
      { publishable_api_key_id: result[0].id },
    );
  }

  const keyId = requiredProvisioningId(current, "publishable_api_key_id");
  const channelId = requiredProvisioningId(current, "sales_channel_id");
  const { link } = provisioningServices(container);
  const linkModule = link.getLinkModule(
    Modules.API_KEY,
    "publishable_key_id",
    Modules.SALES_CHANNEL,
    "sales_channel_id",
  );
  const links = linkModule
    ? await linkModule.list({ publishable_key_id: keyId })
    : [];

  if (!links.some((entry: any) => entry.sales_channel_id === channelId)) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: keyId, add: [channelId], remove: [] },
    });
  }

  return current;
};

export const ensureProvisioningRegion = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  let current = record;
  const { region } = provisioningServices(container);

  if (!current.region_id) {
    const requestedCountries = [...request.commerce.countries].sort();
    const existingRegions = await region.listRegions(
      {},
      { relations: ["countries"], take: 1000 },
    );
    const countryOwners = existingRegions.filter((entry: any) =>
      entry.countries?.some((country: any) =>
        requestedCountries.includes(country.iso_2.toLowerCase()),
      ),
    );
    const compatible = countryOwners.filter((entry: any) => {
      const countries = (entry.countries ?? [])
        .map((country: any) => country.iso_2.toLowerCase())
        .sort();

      return (
        entry.currency_code.toLowerCase() === request.store.currency_code &&
        countries.length === requestedCountries.length &&
        countries.every(
          (country: string, index: number) =>
            country === requestedCountries[index],
        )
      );
    });

    if (
      compatible.length > 1 ||
      (countryOwners.length && compatible.length !== 1)
    ) {
      throw provisioningConflict(
        "The requested countries belong to an incompatible or ambiguous Region.",
      );
    }

    if (compatible.length === 1) {
      current = await checkpointProvisioningResource(
        container,
        current,
        "region",
        "region",
        compatible[0].id,
        "reused",
        { region_id: compatible[0].id },
      );
    } else {
      const { result } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: request.commerce.region_name,
              currency_code: request.store.currency_code,
              countries: request.commerce.countries,
              payment_providers: ["pp_system_default"],
              metadata: { saas_provisioning_id: record.id },
            },
          ],
        },
      });

      current = await checkpointProvisioningResource(
        container,
        current,
        "region",
        "region",
        result[0].id,
        "created",
        { region_id: result[0].id },
      );
    }
  }

  const storeId = requiredProvisioningId(current, "medusa_store_id");
  const regionId = requiredProvisioningId(current, "region_id");
  const { store } = provisioningServices(container);
  const medusaStore = await store.retrieveStore(storeId);

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: storeId },
      update: {
        default_region_id: regionId,
        metadata: {
          ...(medusaStore.metadata ?? {}),
          saas_allowed_region_ids: [regionId],
        },
      },
    },
  });

  return current;
};

export const ensureProvisioningStockLocation = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  let current = record;

  if (!current.stock_location_id) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: request.commerce.stock_location_name,
            address: {
              address_1: "Provisioned stock location",
              country_code: request.commerce.countries[0].toUpperCase(),
            },
            metadata: { saas_provisioning_id: record.id },
          },
        ],
      },
    });

    current = await checkpointProvisioningResource(
      container,
      current,
      "stock_location",
      "stock_location",
      result[0].id,
      "created",
      { stock_location_id: result[0].id },
    );
  }

  const locationId = requiredProvisioningId(current, "stock_location_id");
  const channelId = requiredProvisioningId(current, "sales_channel_id");
  const storeId = requiredProvisioningId(current, "medusa_store_id");
  const { link, store } = provisioningServices(container);
  const linkModule = link.getLinkModule(
    Modules.SALES_CHANNEL,
    "sales_channel_id",
    Modules.STOCK_LOCATION,
    "stock_location_id",
  );
  const links = linkModule
    ? await linkModule.list({ stock_location_id: locationId })
    : [];

  if (!links.some((entry: any) => entry.sales_channel_id === channelId)) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: locationId, add: [channelId], remove: [] },
    });
  }

  const medusaStore = await store.retrieveStore(storeId);
  if (medusaStore.default_location_id !== locationId) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: storeId },
        update: { default_location_id: locationId },
      },
    });
  }

  return current;
};
