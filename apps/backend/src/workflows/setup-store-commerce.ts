import type { MedusaContainer } from "@medusajs/framework/types"

import {
  normalizeStoreProfileId,
  safeCommerceSetupError,
  type CommerceSetupPinnedPolicy,
  type CommerceSetupWorkflowInput,
  type SafeCommerceSetupResult,
  type StoreCommerceSetupInput,
} from "./commerce-readiness-contract"
import {
  applyCommerceStoreAllowlist,
  assertCommerceSetupPinnedPolicy,
  ensureCommerceFulfillmentSet,
  ensureCommerceProvider,
  ensureCommerceShippingOption,
  ensureCommerceShippingProfile,
  resolveCommercePrerequisites,
  resolveCommerceSetupPinnedPolicy,
  validateCommerceReadinessGraph,
  type CommercePrerequisites,
} from "./commerce-readiness-resources"
import {
  checkpointCommerceStep,
  commerceReadinessServices,
  commerceResourceStateFor,
  commerceSetupConflict,
  completedCommerceSetupResult,
  createOrResolveCommerceSetupRecord,
  maybeInjectCommerceSetupFailure,
  publicCommerceSetupError,
  recordCommerceSetupEvent,
  requiredCommerceResource,
  updateCommerceReadiness,
  updateCommerceSetupRecord,
  withCommerceSetupLease,
  type CommerceSetupLeaseGuard,
  type CommerceSetupRecord,
} from "./commerce-readiness-state"

const completeCommerceSetup = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  request: StoreCommerceSetupInput,
  pinnedPolicy: CommerceSetupPinnedPolicy,
  leaseGuard: CommerceSetupLeaseGuard,
): Promise<CommerceSetupRecord> => {
  await leaseGuard.assertActive()
  const prerequisites = await resolveCommercePrerequisites(
    container,
    record.store_profile_id,
  )
  const currentPolicy = await resolveCommerceSetupPinnedPolicy(
    container,
    prerequisites,
  )
  assertCommerceSetupPinnedPolicy(pinnedPolicy, currentPolicy)

  await leaseGuard.assertActive()
  const readiness = await validateCommerceReadinessGraph(
    container,
    record,
    prerequisites,
    request,
  )
  const state = commerceResourceStateFor(record)
  const createdResources = Object.fromEntries(
    Object.entries(state).map(([name, value]) => [
      name,
      value.disposition === "reused" ? "reused" : "created",
    ]),
  ) as Record<string, "created" | "reused">
  const result: SafeCommerceSetupResult = {
    setup_id: record.id,
    status: "completed",
    readiness_status: "ready",
    store_profile_id: prerequisites.profile.id,
    medusa_store_id: prerequisites.store.id,
    region_id: prerequisites.region.id,
    stock_location_id: prerequisites.location.id,
    fulfillment_provider_id: requiredCommerceResource(
      record,
      "fulfillment_provider",
    ),
    shipping_profile_id: requiredCommerceResource(record, "shipping_profile"),
    fulfillment_set_id: requiredCommerceResource(record, "fulfillment_set"),
    service_zone_id: requiredCommerceResource(record, "service_zone"),
    shipping_option_ids: [requiredCommerceResource(record, "shipping_option")],
    currency_code: prerequisites.currencyCode,
    countries: prerequisites.countries,
    created_resources: createdResources,
  }
  await leaseGuard.assertActive()
  let completed = await checkpointCommerceStep(
    container,
    record,
    "graph_validation",
    { readiness_id: readiness.id },
  )
  await leaseGuard.assertActive()
  completed = await updateCommerceSetupRecord(container, completed, {
    status: "completed",
    result_snapshot: result,
    failure_code: null,
    failure_message_safe: null,
    completed_at: new Date(),
  })
  await recordCommerceSetupEvent(
    container,
    completed,
    "completed",
    "graph_validation",
    {
      store_profile_id: result.store_profile_id,
      shipping_option_count: result.shipping_option_ids.length,
    },
  )
  return completed
}

const markReadinessFailed = async (
  container: MedusaContainer,
  prerequisites: CommercePrerequisites | null,
  record: CommerceSetupRecord,
  safe: { code: string; message: string },
): Promise<void> => {
  if (!prerequisites) {
    return
  }

  await updateCommerceReadiness(container, prerequisites.readiness, {
    status: "failed",
    last_setup_id: record.id,
    failure_code: safe.code,
    failure_message_safe: safe.message,
    validated_at: null,
    revision: Number(prerequisites.readiness.revision ?? 0) + 1,
  }).catch(() => null)
}

const executeOwnedCommerceSetup = async (
  container: MedusaContainer,
  initialRecord: CommerceSetupRecord,
  request: StoreCommerceSetupInput,
  input: CommerceSetupWorkflowInput,
  pinnedPolicy: CommerceSetupPinnedPolicy,
  leaseGuard: CommerceSetupLeaseGuard,
): Promise<CommerceSetupRecord> => {
  const currentPrerequisites = await resolveCommercePrerequisites(
    container,
    initialRecord.store_profile_id,
  )
  const currentPolicy = await resolveCommerceSetupPinnedPolicy(
    container,
    currentPrerequisites,
  )
  assertCommerceSetupPinnedPolicy(pinnedPolicy, currentPolicy)

  await leaseGuard.assertActive()
  let record = await updateCommerceSetupRecord(container, initialRecord, {
    status: "running",
    failure_code: null,
    failure_message_safe: null,
    retry_count: ["failed", "requires_attention"].includes(
      initialRecord.status,
    )
      ? Number(initialRecord.retry_count ?? 0) + 1
      : Number(initialRecord.retry_count ?? 0),
  })
  let prerequisites: CommercePrerequisites | null = currentPrerequisites

  try {
    await leaseGuard.assertActive()
    await updateCommerceReadiness(container, prerequisites.readiness, {
      status: "configuring",
      last_setup_id: record.id,
      failure_code: null,
      failure_message_safe: null,
      validated_at: null,
    })
    record = await checkpointCommerceStep(
      container,
      record,
      "validate_store",
      {
        plan_code: prerequisites.profile.plan_code,
        country_count: prerequisites.countries.length,
      },
    )
    maybeInjectCommerceSetupFailure(input, "validate_store")
    await leaseGuard.assertActive()
    record = await ensureCommerceProvider(container, record, prerequisites)
    maybeInjectCommerceSetupFailure(input, "fulfillment_provider")
    await leaseGuard.assertActive()
    record = await ensureCommerceShippingProfile(container, record)
    maybeInjectCommerceSetupFailure(input, "shipping_profile")
    await leaseGuard.assertActive()
    record = await ensureCommerceFulfillmentSet(
      container,
      record,
      prerequisites,
    )
    maybeInjectCommerceSetupFailure(input, "fulfillment_set")
    await leaseGuard.assertActive()
    record = await ensureCommerceShippingOption(
      container,
      record,
      prerequisites,
      request,
    )
    maybeInjectCommerceSetupFailure(input, "shipping_option")
    await leaseGuard.assertActive()
    record = await applyCommerceStoreAllowlist(
      container,
      record,
      prerequisites,
    )
    maybeInjectCommerceSetupFailure(input, "store_allowlist")
    maybeInjectCommerceSetupFailure(input, "graph_validation")
    await leaseGuard.assertActive()
    return await completeCommerceSetup(
      container,
      record,
      request,
      pinnedPolicy,
      leaseGuard,
    )
  } catch (error) {
    const safe = safeCommerceSetupError(error)
    const state = commerceResourceStateFor(record)

    for (const value of Object.values(state)) {
      if (value.disposition === "created") {
        value.disposition = "retained_for_retry"
      }
    }

    await markReadinessFailed(container, prerequisites, record, safe)
    const failed = await updateCommerceSetupRecord(container, record, {
      status: "failed",
      resource_state: state,
      failure_code: safe.code,
      failure_message_safe: safe.message,
      completed_at: null,
    })
    await recordCommerceSetupEvent(
      container,
      failed,
      "failed",
      failed.current_step,
      { failure_code: safe.code },
    )
    throw publicCommerceSetupError(error)
  }
}

export const executeStoreCommerceSetup = async (
  container: MedusaContainer,
  input: CommerceSetupWorkflowInput,
): Promise<SafeCommerceSetupResult> => {
  try {
    const requestedProfileId = normalizeStoreProfileId(input.store_profile_id)
    const initialPrerequisites = await resolveCommercePrerequisites(
      container,
      requestedProfileId,
    )
    const pinnedPolicy = await resolveCommerceSetupPinnedPolicy(
      container,
      initialPrerequisites,
    )
    const pinnedInput: CommerceSetupWorkflowInput = {
      ...input,
      store_profile_id: initialPrerequisites.profile.id,
      pinned_policy: pinnedPolicy,
    }
    const resolved = await createOrResolveCommerceSetupRecord(
      container,
      pinnedInput,
    )
    let record = resolved.record
    const request = resolved.request
    const snapshot =
      record.request_snapshot &&
      typeof record.request_snapshot === "object" &&
      !Array.isArray(record.request_snapshot)
        ? record.request_snapshot
        : {}

    if (snapshot.pinned_policy) {
      assertCommerceSetupPinnedPolicy(snapshot.pinned_policy, pinnedPolicy)
    } else {
      record = await updateCommerceSetupRecord(container, record, {
        request_snapshot: {
          ...snapshot,
          pinned_policy: pinnedPolicy,
        },
      })
    }

    if (record.status === "completed") {
      return completedCommerceSetupResult(record)
    }
    if (record.status === "requires_attention") {
      throw commerceSetupConflict(
        "Commerce setup requires operator attention before it can run again.",
      )
    }
    if (record.status === "cancelled") {
      throw commerceSetupConflict("The commerce setup attempt was cancelled.")
    }

    const completed = await withCommerceSetupLease(
      container,
      record,
      (current, leaseGuard) =>
        executeOwnedCommerceSetup(
          container,
          current,
          request,
          pinnedInput,
          pinnedPolicy,
          leaseGuard,
        ),
    )
    return completedCommerceSetupResult(completed)
  } catch (error) {
    throw publicCommerceSetupError(error)
  }
}

export const setupStoreCommerceWorkflow = (container: MedusaContainer) => ({
  run: async ({ input }: { input: CommerceSetupWorkflowInput }) => ({
    result: await executeStoreCommerceSetup(container, input),
  }),
})
