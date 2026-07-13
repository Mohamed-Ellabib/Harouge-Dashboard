import { randomUUID } from "crypto";
import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";

import { normalizeDomain } from "../api/_utils/vendors";
import { MARKETPLACE_MODULE } from "../modules/marketplace";
import { SAAS_MODULE } from "../modules/saas";
import {
  normalizeIdempotencyKey,
  normalizeProvisionStoreInput,
  provisioningRequestHash,
  safeRequestSnapshot,
  temporaryDomainForHandle,
  type ProvisioningStep,
  type ProvisioningWorkflowInput,
  type SafeProvisioningResult,
} from "./provisioning-contract";

export type ResourceDisposition =
  "created" | "reused" | "retained_for_retry" | "compensated";

export type ResourceState = Record<
  string,
  { id: string; disposition: ResourceDisposition }
>;

export type ProvisioningRecord = Record<string, any>;

const LEASE_MILLISECONDS = 5 * 60 * 1000;
const WAIT_MILLISECONDS = 45 * 1000;
const POLL_MILLISECONDS = 100;

const safeProvisioningMedusaError = (
  type: string,
  message: string,
): MedusaError => {
  const error = new MedusaError(type as any, message) as MedusaError & {
    provisioning_safe?: boolean;
  };
  error.provisioning_safe = true;
  return error;
};

export const provisioningConflict = (message: string) =>
  safeProvisioningMedusaError(MedusaError.Types.CONFLICT, message);

export const provisioningInvalid = (message: string) =>
  safeProvisioningMedusaError(MedusaError.Types.INVALID_DATA, message);

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const provisioningServices = (container: MedusaContainer) => ({
  saas: container.resolve(SAAS_MODULE) as any,
  marketplace: container.resolve(MARKETPLACE_MODULE) as any,
  store: container.resolve(Modules.STORE) as any,
  region: container.resolve(Modules.REGION) as any,
  stockLocation: container.resolve(Modules.STOCK_LOCATION) as any,
  apiKey: container.resolve(Modules.API_KEY) as any,
  link: container.resolve(ContainerRegistrationKeys.LINK) as any,
});

export const resourceStateFor = (record: ProvisioningRecord): ResourceState => {
  if (
    !record.resource_state ||
    typeof record.resource_state !== "object" ||
    Array.isArray(record.resource_state)
  ) {
    return {};
  }

  return record.resource_state as ResourceState;
};

export const requiredProvisioningId = (
  record: ProvisioningRecord,
  key: string,
): string => {
  const value = record[key];

  if (typeof value !== "string" || !value) {
    throw provisioningInvalid(
      "Provisioning is missing required result " + key + ".",
    );
  }

  return value;
};

export const updateProvisioningRecord = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  update: Record<string, unknown>,
): Promise<ProvisioningRecord> => {
  const { saas } = provisioningServices(container);
  await saas.updateStoreProvisionings({ id: record.id, ...update });
  return await saas.retrieveStoreProvisioning(record.id);
};

export const recordProvisioningEvent = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  eventType: string,
  step: string,
  safeDetails: Record<string, unknown> | null = null,
) => {
  const { saas } = provisioningServices(container);

  await saas.createStoreProvisioningEvents({
    provisioning_id: record.id,
    event_type: eventType,
    step,
    actor_id: record.actor_id,
    safe_details: safeDetails,
  });
};

export const checkpointProvisioningResource = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  step: ProvisioningStep,
  resource: string,
  id: string,
  disposition: "created" | "reused",
  fields: Record<string, unknown>,
): Promise<ProvisioningRecord> => {
  const state = resourceStateFor(record);
  state[resource] = { id, disposition };
  const updated = await updateProvisioningRecord(container, record, {
    ...fields,
    current_step: step,
    resource_state: state,
  });

  await recordProvisioningEvent(
    container,
    updated,
    disposition === "created" ? "step_completed" : "resource_reused",
    step,
    { resource, resource_id: id },
  );
  return updated;
};

export const maybeInjectProvisioningFailure = (
  input: ProvisioningWorkflowInput,
  step: ProvisioningStep,
) => {
  if (!input.failure_step) {
    return;
  }

  if (process.env.NODE_ENV !== "test") {
    throw provisioningInvalid("Failure injection is available only in tests.");
  }

  if (input.failure_step === step) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Injected provisioning failure at " + step + ".",
    );
  }
};

export const createOrResolveProvisioningRecord = async (
  container: MedusaContainer,
  input: ProvisioningWorkflowInput,
): Promise<{
  record: ProvisioningRecord;
  normalized: ReturnType<typeof normalizeProvisionStoreInput>;
}> => {
  const { saas } = provisioningServices(container);
  const normalized = normalizeProvisionStoreInput(input.request);
  const idempotencyKey = normalizeIdempotencyKey(input.idempotency_key);
  const actorId =
    typeof input.actor_id === "string" && input.actor_id.trim()
      ? input.actor_id.trim()
      : null;

  if (!actorId) {
    throw provisioningInvalid("A platform administrator actor is required.");
  }

  const requestHash = provisioningRequestHash(normalized);
  const temporaryDomain = temporaryDomainForHandle(normalized.store.handle);
  const requestedDomain = normalizeDomain(
    normalized.domain.custom_hostname ?? temporaryDomain,
  );
  const existing = await saas.listStoreProvisionings({
    idempotency_key: idempotencyKey,
  });

  if (existing.length > 1) {
    throw provisioningInvalid("Provisioning idempotency state is ambiguous.");
  }

  if (existing.length === 1) {
    if (existing[0].request_hash !== requestHash) {
      throw provisioningConflict(
        "The idempotency key was already used with different provisioning input.",
      );
    }

    return { record: existing[0], normalized };
  }

  try {
    const record = await saas.createStoreProvisionings({
      idempotency_key: idempotencyKey,
      request_hash: requestHash,
      requested_handle: normalized.store.handle,
      requested_domain: requestedDomain,
      requested_owner_email: normalized.owner.email,
      requested_plan_code: normalized.store.plan_code,
      status: "pending",
      current_step: "validate_input",
      request_snapshot: safeRequestSnapshot(normalized),
      result_snapshot: null,
      resource_state: {},
      failure_code: null,
      failure_message_safe: null,
      retry_count: 0,
      actor_id: actorId,
      completed_at: null,
    });

    await recordProvisioningEvent(
      container,
      record,
      "started",
      "validate_input",
      {
        requested_handle: normalized.store.handle,
        requested_domain: requestedDomain,
      },
    );
    return { record, normalized };
  } catch {
    const [sameKey, sameHandle, sameDomain] = await Promise.all([
      saas.listStoreProvisionings({ idempotency_key: idempotencyKey }),
      saas.listStoreProvisionings({
        requested_handle: normalized.store.handle,
      }),
      saas.listStoreProvisionings({ requested_domain: requestedDomain }),
    ]);

    if (sameKey.length === 1) {
      if (sameKey[0].request_hash !== requestHash) {
        throw provisioningConflict(
          "The idempotency key was already used with different provisioning input.",
        );
      }
      return { record: sameKey[0], normalized };
    }
    if (sameHandle.length) {
      throw provisioningConflict(
        "The normalized Store handle is already reserved.",
      );
    }
    if (sameDomain.length) {
      throw provisioningConflict(
        "The normalized Store domain is already reserved.",
      );
    }
    throw provisioningConflict(
      "The provisioning request conflicts with an existing reservation.",
    );
  }
};

const releaseLease = async (
  container: MedusaContainer,
  idempotencyKey: string,
  leaseToken: string,
) => {
  const { saas } = provisioningServices(container);
  const leases = await saas.listStoreProvisioningLeases({
    idempotency_key: idempotencyKey,
  });

  if (leases.length === 1 && leases[0].lease_token === leaseToken) {
    await saas.deleteStoreProvisioningLeases(leases[0].id);
  }
};

const waitForLeaseOwner = async (
  container: MedusaContainer,
  recordId: string,
  requestHash: string,
): Promise<ProvisioningRecord | null> => {
  const { saas } = provisioningServices(container);
  const deadline = Date.now() + WAIT_MILLISECONDS;

  while (Date.now() < deadline) {
    const current = await saas.retrieveStoreProvisioning(recordId);

    if (current.request_hash !== requestHash) {
      throw provisioningConflict(
        "Provisioning input changed while waiting for its result.",
      );
    }
    if (current.status === "completed") {
      return current;
    }

    const leases = await saas.listStoreProvisioningLeases({
      idempotency_key: current.idempotency_key,
    });

    if (
      !leases.length ||
      new Date(leases[0].expires_at).getTime() <= Date.now()
    ) {
      return null;
    }

    await delay(POLL_MILLISECONDS);
  }

  throw provisioningConflict(
    "Provisioning is already running. Retry the status request.",
  );
};

const acquireLease = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
): Promise<{ token: string; completed: ProvisioningRecord | null }> => {
  const { saas } = provisioningServices(container);
  const token = randomUUID();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await saas.createStoreProvisioningLeases({
        idempotency_key: record.idempotency_key,
        provisioning_id: record.id,
        lease_token: token,
        expires_at: new Date(Date.now() + LEASE_MILLISECONDS),
      });
      return { token, completed: null };
    } catch {
      const leases = await saas.listStoreProvisioningLeases({
        idempotency_key: record.idempotency_key,
      });

      if (
        leases.length === 1 &&
        new Date(leases[0].expires_at).getTime() <= Date.now()
      ) {
        await saas
          .deleteStoreProvisioningLeases(leases[0].id)
          .catch(() => null);
        continue;
      }

      const completed = await waitForLeaseOwner(
        container,
        record.id,
        record.request_hash,
      );
      if (completed) {
        return { token: "", completed };
      }
    }
  }

  throw provisioningConflict(
    "Provisioning lease could not be acquired safely.",
  );
};

export const withProvisioningLease = async (
  container: MedusaContainer,
  record: ProvisioningRecord,
  execute: (record: ProvisioningRecord) => Promise<ProvisioningRecord>,
): Promise<ProvisioningRecord> => {
  const lease = await acquireLease(container, record);

  if (lease.completed) {
    return lease.completed;
  }

  try {
    const current = await provisioningServices(
      container,
    ).saas.retrieveStoreProvisioning(record.id);

    if (current.status === "completed") {
      return current;
    }

    return await execute(current);
  } finally {
    await releaseLease(container, record.idempotency_key, lease.token).catch(
      () => null,
    );
  }
};

export const withExclusiveProvisioningOperation = async <T>(
  container: MedusaContainer,
  operationName: string,
  provisioningId: string,
  execute: () => Promise<T>,
): Promise<T> => {
  const { saas } = provisioningServices(container);
  const leaseKey = "exclusive:" + operationName;
  const leaseToken = randomUUID();
  const deadline = Date.now() + WAIT_MILLISECONDS;
  let acquired = false;

  while (Date.now() < deadline && !acquired) {
    try {
      await saas.createStoreProvisioningLeases({
        idempotency_key: leaseKey,
        provisioning_id: provisioningId,
        lease_token: leaseToken,
        expires_at: new Date(Date.now() + LEASE_MILLISECONDS),
      });
      acquired = true;
    } catch {
      const leases = await saas.listStoreProvisioningLeases({
        idempotency_key: leaseKey,
      });

      if (
        leases.length === 1 &&
        new Date(leases[0].expires_at).getTime() <= Date.now()
      ) {
        await saas
          .deleteStoreProvisioningLeases(leases[0].id)
          .catch(() => null);
        continue;
      }

      await delay(POLL_MILLISECONDS);
    }
  }

  if (!acquired) {
    throw provisioningConflict(
      "A required provisioning operation is busy. Retry the request.",
    );
  }

  try {
    return await execute();
  } finally {
    await releaseLease(container, leaseKey, leaseToken).catch(() => null);
  }
};
export const serializeProvisioningStatus = (
  record: ProvisioningRecord,
): Record<string, unknown> => ({
  id: record.id,
  status: record.status,
  current_step: record.current_step,
  requested_handle: record.requested_handle,
  requested_domain: record.requested_domain,
  requested_owner_email: record.requested_owner_email,
  requested_plan_code: record.requested_plan_code,
  retry_count: record.retry_count,
  failure_code: record.failure_code ?? null,
  failure_message: record.failure_message_safe ?? null,
  result:
    record.status === "completed" ? (record.result_snapshot ?? null) : null,
  created_at: record.created_at,
  updated_at: record.updated_at,
  completed_at: record.completed_at ?? null,
});

export const completedProvisioningResult = (
  record: ProvisioningRecord,
): SafeProvisioningResult => {
  if (record.status !== "completed" || !record.result_snapshot) {
    throw provisioningInvalid("Provisioning has no completed result.");
  }

  return record.result_snapshot as SafeProvisioningResult;
};

export const cancelProvisioningAttempt = async (
  container: MedusaContainer,
  provisioningId: string,
  actorId: string,
): Promise<Record<string, unknown>> => {
  const { saas } = provisioningServices(container);
  const record = await saas.retrieveStoreProvisioning(provisioningId);

  if (record.status === "completed") {
    throw provisioningConflict(
      "Completed Stores cannot be cancelled or deleted.",
    );
  }
  if (record.status === "running") {
    throw provisioningConflict(
      "A running provisioning attempt cannot be cancelled.",
    );
  }
  if (Object.keys(resourceStateFor(record)).length) {
    const attention = await updateProvisioningRecord(container, record, {
      status: "requires_attention",
      failure_code: "cleanup_requires_attention",
      failure_message_safe:
        "Created resources were retained; reviewed cleanup is required.",
    });
    await recordProvisioningEvent(
      container,
      { ...attention, actor_id: actorId },
      "requires_attention",
      attention.current_step,
      { reason: "resources_retained" },
    );
    return serializeProvisioningStatus(attention);
  }

  const cancelled = await updateProvisioningRecord(container, record, {
    status: "cancelled",
    failure_code: null,
    failure_message_safe: null,
  });
  await recordProvisioningEvent(
    container,
    { ...cancelled, actor_id: actorId },
    "cancelled",
    cancelled.current_step,
  );
  return serializeProvisioningStatus(cancelled);
};
