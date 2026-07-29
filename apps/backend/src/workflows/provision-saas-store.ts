import type { MedusaContainer } from "@medusajs/framework/types";
import {
  safeProvisioningError,
  temporaryDomainForHandle,
  type ProvisionStoreInput,
  type ProvisioningWorkflowInput,
  type SafeProvisioningResult,
} from "./provisioning-contract";
import {
  ensureProvisioningMedusaStore,
  ensureProvisioningPublishableKey,
  ensureProvisioningRegion,
  ensureProvisioningSalesChannel,
  ensureProvisioningStockLocation,
  ensureProvisioningStoreProfile,
  ensureProvisioningTenant,
} from "./provisioning-commerce-resources";
import {
  ensureProvisioningBrand,
  ensureProvisioningDomains,
  ensureProvisioningMembership,
  ensureProvisioningMerchantAccount,
} from "./provisioning-profile-resources";
import {
  validateProvisioningContexts,
  validateProvisioningStructure,
} from "./provisioning-graph";
import {
  completedProvisioningResult,
  createOrResolveProvisioningRecord,
  maybeInjectProvisioningFailure,
  provisioningConflict,
  provisioningServices,
  recordProvisioningEvent,
  requiredProvisioningId,
  resourceStateFor,
  updateProvisioningRecord,
  withProvisioningLease,
  type ProvisioningRecord,
} from "./provisioning-state";
import { ensureStoreCommerceReadiness } from "./commerce-readiness-state";

const completeProvisioningGraph = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  request: ProvisionStoreInput,
): Promise<ProvisioningRecord> => {
  const { saas, marketplace } = provisioningServices(container);
  const { key, member } = await validateProvisioningStructure(
    container,
    record,
    request,
  );
  const profileId = requiredProvisioningId(record, "store_profile_id");
  const vendorId = requiredProvisioningId(record, "legacy_vendor_id");
  const profile = await saas.retrieveStoreProfile(profileId);

  await ensureStoreCommerceReadiness(container, profile);

  await saas.updateStoreProfiles({ id: profileId, status: "active" });
  await marketplace.updateVendors({ id: vendorId, status: "active" });

  try {
    await validateProvisioningContexts(container, record, request, key, member);
  } catch (error) {
    await Promise.allSettled([
      saas.updateStoreProfiles({ id: profileId, status: "draft" }),
      marketplace.updateVendors({ id: vendorId, status: "draft" }),
    ]);
    throw error;
  }

  const state = resourceStateFor(record);
  const createdResources = Object.fromEntries(
    Object.entries(state)
      .filter(([, value]) => value.disposition !== "compensated")
      .map(([name, value]) => [
        name,
        value.disposition === "reused" ? "reused" : "created",
      ]),
  ) as Record<string, "created" | "reused">;
  const result: SafeProvisioningResult = {
    provisioning_id: record.id,
    status: "completed",
    tenant_id: requiredProvisioningId(record, "tenant_id"),
    store_profile_id: profileId,
    medusa_store_id: requiredProvisioningId(record, "medusa_store_id"),
    sales_channel_id: requiredProvisioningId(record, "sales_channel_id"),
    publishable_api_key_id: requiredProvisioningId(
      record,
      "publishable_api_key_id",
    ),
    region_id: requiredProvisioningId(record, "region_id"),
    stock_location_id: requiredProvisioningId(record, "stock_location_id"),
    handle: request.store.handle,
    public_domain: temporaryDomainForHandle(request.store.handle),
    custom_domain: request.domain.custom_hostname ?? null,
    owner_email: request.owner.email,
    plan_code: request.store.plan_code,
    created_resources: createdResources,
  };

  const completed = await updateProvisioningRecord(container, record, {
    status: "completed",
    current_step: "graph_validation",
    result_snapshot: result,
    failure_code: null,
    failure_message_safe: null,
    completed_at: new Date(),
  });
  await recordProvisioningEvent(
    container,
    completed,
    "completed",
    "graph_validation",
    {
      store_profile_id: profileId,
      medusa_store_id: result.medusa_store_id,
    },
  );
  return completed;
};

const executeOwnedProvisioning = async (
  container: MedusaContainer,
  initialRecord: ProvisioningRecord,
  request: ProvisionStoreInput,
  input: ProvisioningWorkflowInput,
): Promise<ProvisioningRecord> => {
  let record = await updateProvisioningRecord(container, initialRecord, {
    status: "running",
    failure_code: null,
    failure_message_safe: null,
    retry_count:
      initialRecord.status === "failed" ||
      initialRecord.status === "requires_attention"
        ? Number(initialRecord.retry_count ?? 0) + 1
        : Number(initialRecord.retry_count ?? 0),
  });

  try {
    record = await ensureProvisioningTenant(container, record, request);
    maybeInjectProvisioningFailure(input, "tenant");
    record = await ensureProvisioningMedusaStore(container, record, request);
    maybeInjectProvisioningFailure(input, "medusa_store");
    record = await ensureProvisioningStoreProfile(container, record, request);
    maybeInjectProvisioningFailure(input, "store_profile");
    record = await ensureProvisioningSalesChannel(container, record, request);
    maybeInjectProvisioningFailure(input, "sales_channel");
    record = await ensureProvisioningPublishableKey(container, record, request);
    maybeInjectProvisioningFailure(input, "publishable_key");
    record = await ensureProvisioningRegion(container, record, request);
    maybeInjectProvisioningFailure(input, "region");
    record = await ensureProvisioningStockLocation(container, record, request);
    maybeInjectProvisioningFailure(input, "stock_location");
    record = await ensureProvisioningBrand(container, record, request);
    maybeInjectProvisioningFailure(input, "brand");
    record = await ensureProvisioningDomains(container, record, request);
    maybeInjectProvisioningFailure(input, "domain");
    record = await ensureProvisioningMerchantAccount(
      container,
      record,
      request,
    );
    maybeInjectProvisioningFailure(input, "merchant_account");
    record = await ensureProvisioningMembership(container, record);
    maybeInjectProvisioningFailure(input, "membership");
    maybeInjectProvisioningFailure(input, "graph_validation");
    return await completeProvisioningGraph(container, record, request);
  } catch (error) {
    const safe = safeProvisioningError(error);
    const state = resourceStateFor(record);

    for (const value of Object.values(state)) {
      if (value.disposition === "created") {
        value.disposition = "retained_for_retry";
      }
    }

    const failed = await updateProvisioningRecord(container, record, {
      status: "failed",
      resource_state: state,
      failure_code: safe.code,
      failure_message_safe: safe.message,
      completed_at: null,
    });
    await recordProvisioningEvent(
      container,
      failed,
      "failed",
      failed.current_step,
      { failure_code: safe.code },
    );
    throw error;
  }
};

export const executeSaasStoreProvisioning = async (
  container: MedusaContainer,
  input: ProvisioningWorkflowInput,
): Promise<SafeProvisioningResult> => {
  const { record, normalized } = await createOrResolveProvisioningRecord(
    container,
    input,
  );

  if (record.status === "completed") {
    return completedProvisioningResult(record);
  }
  if (record.status === "cancelled") {
    throw provisioningConflict("The provisioning attempt was cancelled.");
  }

  const completed = await withProvisioningLease(container, record, (current) =>
    executeOwnedProvisioning(container, current, normalized, input),
  );
  return completedProvisioningResult(completed);
};

export const provisionSaasStoreWorkflow = (container: MedusaContainer) => ({
  run: async ({ input }: { input: ProvisioningWorkflowInput }) => ({
    result: await executeSaasStoreProvisioning(container, input),
  }),
});
