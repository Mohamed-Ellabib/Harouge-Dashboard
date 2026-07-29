import { randomUUID } from "crypto"
import { AsyncLocalStorage } from "async_hooks"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  generateEntityId,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import { SAAS_MODULE } from "../modules/saas"
import type { PlanCode } from "./provisioning-contract"
import {
  normalizeCommerceSetupRequest,
  safeCommerceSetupError,
  type CommerceSetupStep,
  type CommerceSetupWorkflowInput,
  type SafeCommerceSetupResult,
  type StoreCommerceSetupInput,
} from "./commerce-readiness-contract"

export type CommerceResourceDisposition =
  | "created"
  | "reused"
  | "retained_for_retry"

export type CommerceResourceState = Record<
  string,
  { id: string; disposition: CommerceResourceDisposition }
>

export type CommerceSetupRecord = Record<string, any>
export type CommerceReadinessRecord = Record<string, any>

export type CommerceSetupLeaseGuard = {
  assertActive: (options?: { allowCompleted?: boolean }) => Promise<void>
}

type ActiveCommerceSetupLease = {
  setupId: string
  storeProfileId: string
  leaseKey: string
  token: string
}

const LEASE_MILLISECONDS = 5 * 60 * 1000
const WAIT_MILLISECONDS = 45 * 1000
const POLL_MILLISECONDS = 100
const activeCommerceSetupLease =
  new AsyncLocalStorage<ActiveCommerceSetupLease>()

const safeError = (type: string, message: string): MedusaError => {
  const error = new MedusaError(type as any, message) as MedusaError & {
    commerce_setup_safe?: boolean
  }
  error.commerce_setup_safe = true
  return error
}

export const commerceSetupConflict = (message: string) =>
  safeError(MedusaError.Types.CONFLICT, message)

export const commerceSetupInvalid = (message: string) =>
  safeError(MedusaError.Types.INVALID_DATA, message)

export const commerceSetupForbidden = (message: string) =>
  safeError(MedusaError.Types.FORBIDDEN, message)

const publicCommerceSetupErrorTypes = new Set<string>([
  MedusaError.Types.CONFLICT,
  MedusaError.Types.FORBIDDEN,
  MedusaError.Types.INVALID_DATA,
  MedusaError.Types.UNEXPECTED_STATE,
])

export const publicCommerceSetupError = (error: unknown): MedusaError => {
  if (
    error instanceof MedusaError &&
    (error as MedusaError & { commerce_setup_safe?: boolean })
      .commerce_setup_safe === true &&
    publicCommerceSetupErrorTypes.has(String(error.type))
  ) {
    return safeError(String(error.type), error.message.slice(0, 500))
  }

  const safe = safeCommerceSetupError(error)
  return safeError(MedusaError.Types.UNEXPECTED_STATE, safe.message)
}

export const commerceReadinessServices = (container: MedusaContainer) => ({
  saas: container.resolve(SAAS_MODULE) as any,
  store: container.resolve(Modules.STORE) as any,
  region: container.resolve(Modules.REGION) as any,
  stockLocation: container.resolve(Modules.STOCK_LOCATION) as any,
  fulfillment: container.resolve(Modules.FULFILLMENT) as any,
  payment: container.resolve(Modules.PAYMENT) as any,
  link: container.resolve(ContainerRegistrationKeys.LINK) as any,
  query: container.resolve(ContainerRegistrationKeys.QUERY) as any,
  remoteQuery: container.resolve(ContainerRegistrationKeys.REMOTE_QUERY) as any,
})

type LeaseFenceOutcome =
  | "active"
  | "attention"
  | "cancelled"
  | "completed"
  | "expired"
  | "lost"

type LeaseAttentionOutcome =
  | "transitioned"
  | "attention"
  | "cancelled"
  | "completed"
  | "active_expected"
  | "active_replacement"
  | "changed"
  | "missing"

type ObservedCommerceSetupLease = {
  leaseKey: string
  setupId: string
  token: string
  reason: "expired" | "lost"
}

type LeaseAttentionResult = {
  outcome: LeaseAttentionOutcome
  record: CommerceSetupRecord
}

const setupJsonColumns = new Set([
  "request_snapshot",
  "result_snapshot",
  "resource_state",
])
const readinessJsonColumns = new Set(["shipping_option_ids"])

const databaseClock = async (connection: any): Promise<Date> => {
  const result = await connection.raw("select clock_timestamp() as now")
  const value = result?.rows?.[0]?.now
  const now = value instanceof Date ? value : new Date(value)

  if (!Number.isFinite(now.getTime())) {
    throw commerceSetupInvalid("The commerce setup database clock is unavailable.")
  }

  return now
}

const databaseUpdate = (
  update: Record<string, unknown>,
  jsonColumns: Set<string>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(update).map(([key, value]) => [
      key,
      value !== null && jsonColumns.has(key) ? JSON.stringify(value) : value,
    ]),
  )

const runFencedLeaseOperation = async (
  container: MedusaContainer,
  options: {
    allowCompleted?: boolean
    setupUpdate?: { id: string; update: Record<string, unknown> }
    readinessUpdate?: { id: string; update: Record<string, unknown> }
  } = {},
): Promise<boolean> => {
  const execution = activeCommerceSetupLease.getStore()

  if (!execution) {
    return false
  }

  const pgConnection = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any
  const outcome = (await pgConnection.transaction(async (transaction: any) => {
    const setup = await transaction("store_commerce_setup")
      .where({ id: execution.setupId })
      .whereNull("deleted_at")
      .forUpdate()
      .first()

    if (!setup) {
      return "lost" as LeaseFenceOutcome
    }
    if (setup.status === "requires_attention") {
      return "attention" as LeaseFenceOutcome
    }
    if (setup.status === "cancelled") {
      return "cancelled" as LeaseFenceOutcome
    }

    const lease = await transaction("store_commerce_setup_lease")
      .where({ lease_key: execution.leaseKey })
      .whereNull("deleted_at")
      .forUpdate()
      .first()

    if (
      !lease ||
      lease.setup_id !== execution.setupId ||
      lease.lease_token !== execution.token
    ) {
      return "lost" as LeaseFenceOutcome
    }
    if (setup.status === "completed") {
      return options.allowCompleted
        ? ("active" as LeaseFenceOutcome)
        : ("completed" as LeaseFenceOutcome)
    }
    const now = await databaseClock(transaction)

    if (new Date(lease.expires_at).getTime() <= now.getTime()) {
      return "expired" as LeaseFenceOutcome
    }

    const renewedUntil = new Date(now.getTime() + LEASE_MILLISECONDS)

    await transaction("store_commerce_setup_lease")
      .where({ id: lease.id, lease_token: execution.token })
      .whereNull("deleted_at")
      .update({ expires_at: renewedUntil, updated_at: now })

    if (options.setupUpdate) {
      if (options.setupUpdate.id !== execution.setupId) {
        return "lost" as LeaseFenceOutcome
      }
      await transaction("store_commerce_setup")
        .where({ id: options.setupUpdate.id })
        .whereNull("deleted_at")
        .update({
          ...databaseUpdate(options.setupUpdate.update, setupJsonColumns),
          updated_at: now,
        })
    }

    if (options.readinessUpdate) {
      const readiness = await transaction("store_commerce_readiness")
        .where({ id: options.readinessUpdate.id })
        .whereNull("deleted_at")
        .forUpdate()
        .first()

      if (
        !readiness ||
        readiness.store_profile_id !== execution.storeProfileId
      ) {
        return "lost" as LeaseFenceOutcome
      }
      await transaction("store_commerce_readiness")
        .where({ id: options.readinessUpdate.id })
        .whereNull("deleted_at")
        .update({
          ...databaseUpdate(
            options.readinessUpdate.update,
            readinessJsonColumns,
          ),
          updated_at: now,
        })
    }

    return "active" as LeaseFenceOutcome
  })) as LeaseFenceOutcome

  if (outcome === "active") {
    return true
  }
  if (outcome === "cancelled") {
    throw commerceSetupConflict("The commerce setup attempt was cancelled.")
  }
  if (outcome === "completed") {
    throw commerceSetupConflict("The commerce setup attempt is already complete.")
  }
  if (outcome === "attention") {
    throw attentionConflict()
  }

  const current = await commerceReadinessServices(
    container,
  ).saas.retrieveStoreCommerceSetup(execution.setupId)
  const failure =
    outcome === "expired"
      ? {
          code: "commerce_setup_lease_expired",
          message:
            "Commerce setup requires operator attention because its execution lease expired.",
        }
      : {
          code: "commerce_setup_lease_lost",
          message:
            "Commerce setup requires operator attention because lease ownership was lost.",
        }

  const attention = await activeCommerceSetupLease.exit(async () =>
    transitionCommerceSetupLeaseForAttention(
      container,
      current,
      {
        leaseKey: execution.leaseKey,
        setupId: execution.setupId,
        token: execution.token,
        reason: outcome,
      },
      failure,
    ),
  )

  if (attention.outcome === "active_expected") {
    return await runFencedLeaseOperation(container, options)
  }
  if (attention.outcome === "completed") {
    if (options.allowCompleted) {
      return true
    }
    throw commerceSetupConflict("The commerce setup attempt is already complete.")
  }
  if (attention.outcome === "cancelled") {
    throw commerceSetupConflict("The commerce setup attempt was cancelled.")
  }
  if (
    attention.outcome === "active_replacement" ||
    attention.outcome === "changed" ||
    attention.outcome === "missing"
  ) {
    throw leaseOwnershipConflict()
  }
  throw attentionConflict()
}

export const commerceResourceStateFor = (
  record: CommerceSetupRecord,
): CommerceResourceState => {
  if (
    !record.resource_state ||
    typeof record.resource_state !== "object" ||
    Array.isArray(record.resource_state)
  ) {
    return {}
  }

  return record.resource_state as CommerceResourceState
}

export const requiredCommerceResource = (
  record: CommerceSetupRecord,
  resource: string,
): string => {
  const value = commerceResourceStateFor(record)[resource]?.id

  if (typeof value !== "string" || !value) {
    throw commerceSetupInvalid(
      "Commerce setup is missing required resource " + resource + ".",
    )
  }

  return value
}

export const ensureStoreCommerceReadiness = async (
  container: MedusaContainer,
  storeProfile: Record<string, any>,
): Promise<CommerceReadinessRecord> => {
  const { saas } = commerceReadinessServices(container)
  const records = await saas.listStoreCommerceReadinesses({
    store_profile_id: storeProfile.id,
  })

  if (records.length > 1) {
    throw commerceSetupInvalid("Store commerce readiness is ambiguous.")
  }

  const planCode = storeProfile.plan_code as PlanCode
  const initialStatus =
    planCode === "professional_commerce" ? "pending" : "not_required"

  if (!records.length) {
    return await saas.createStoreCommerceReadinesses({
      store_profile_id: storeProfile.id,
      capability: "online_checkout",
      plan_code: planCode,
      status: initialStatus,
      shipping_option_ids: [],
      revision: 1,
    })
  }

  const current = records[0]

  if (current.plan_code === planCode) {
    return current
  }

  return await saas.updateStoreCommerceReadinesses({
    id: current.id,
    plan_code: planCode,
    status: initialStatus,
    shipping_option_ids:
      planCode === "professional_commerce"
        ? (current.shipping_option_ids ?? [])
        : [],
    failure_code: null,
    failure_message_safe: null,
    validated_at: null,
    revision: Number(current.revision ?? 0) + 1,
  })
}

export const updateCommerceReadiness = async (
  container: MedusaContainer,
  readiness: CommerceReadinessRecord,
  update: Record<string, unknown>,
): Promise<CommerceReadinessRecord> => {
  const { saas } = commerceReadinessServices(container)
  const fenced = await runFencedLeaseOperation(container, {
    readinessUpdate: { id: readiness.id, update },
  })
  if (!fenced) {
    await saas.updateStoreCommerceReadinesses({ id: readiness.id, ...update })
  }
  return await saas.retrieveStoreCommerceReadiness(readiness.id)
}

export const serializeCommerceReadiness = (
  readiness: CommerceReadinessRecord,
): Record<string, unknown> => ({
  id: readiness.id,
  store_profile_id: readiness.store_profile_id,
  capability: readiness.capability,
  plan_code: readiness.plan_code,
  status: readiness.status,
  medusa_store_id: readiness.medusa_store_id ?? null,
  region_id: readiness.region_id ?? null,
  stock_location_id: readiness.stock_location_id ?? null,
  fulfillment_provider_id: readiness.fulfillment_provider_id ?? null,
  shipping_profile_id: readiness.shipping_profile_id ?? null,
  fulfillment_set_id: readiness.fulfillment_set_id ?? null,
  service_zone_id: readiness.service_zone_id ?? null,
  shipping_option_ids: Array.isArray(readiness.shipping_option_ids)
    ? readiness.shipping_option_ids
    : [],
  last_setup_id: readiness.last_setup_id ?? null,
  failure_code: readiness.failure_code ?? null,
  failure_message: readiness.failure_message_safe ?? null,
  validated_at: readiness.validated_at ?? null,
  revision: Number(readiness.revision ?? 1),
  created_at: readiness.created_at,
  updated_at: readiness.updated_at,
})

export const updateCommerceSetupRecord = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  update: Record<string, unknown>,
): Promise<CommerceSetupRecord> => {
  const { saas } = commerceReadinessServices(container)
  const fenced = await runFencedLeaseOperation(container, {
    setupUpdate: { id: record.id, update },
  })
  if (!fenced) {
    await saas.updateStoreCommerceSetups({ id: record.id, ...update })
  }
  return await saas.retrieveStoreCommerceSetup(record.id)
}

export const recordCommerceSetupEvent = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  eventType: string,
  step: CommerceSetupStep,
  safeDetails: Record<string, unknown> | null = null,
): Promise<void> => {
  if (activeCommerceSetupLease.getStore()) {
    await runFencedLeaseOperation(container, {
      allowCompleted: record.status === "completed",
    })
  }
  const { saas } = commerceReadinessServices(container)
  await saas.createStoreCommerceSetupEvents({
    setup_id: record.id,
    event_type: eventType,
    step,
    actor_id: record.actor_id,
    safe_details: safeDetails,
  })
}

export const checkpointCommerceResource = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  step: CommerceSetupStep,
  resource: string,
  id: string,
  disposition: "created" | "reused",
): Promise<CommerceSetupRecord> => {
  const state = commerceResourceStateFor(record)
  state[resource] = { id, disposition }
  const updated = await updateCommerceSetupRecord(container, record, {
    current_step: step,
    resource_state: state,
  })
  await recordCommerceSetupEvent(
    container,
    updated,
    disposition === "created" ? "step_completed" : "resource_reused",
    step,
    { resource, resource_id: id },
  )
  return updated
}

export const checkpointCommerceStep = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  step: CommerceSetupStep,
  safeDetails: Record<string, unknown> | null = null,
): Promise<CommerceSetupRecord> => {
  const updated = await updateCommerceSetupRecord(container, record, {
    current_step: step,
  })
  await recordCommerceSetupEvent(
    container,
    updated,
    "step_completed",
    step,
    safeDetails,
  )
  return updated
}

export const maybeInjectCommerceSetupFailure = (
  input: CommerceSetupWorkflowInput,
  step: CommerceSetupStep,
): void => {
  if (!input.failure_step) {
    return
  }
  if (process.env.NODE_ENV !== "test") {
    throw commerceSetupInvalid("Failure injection is available only in tests.")
  }
  if (input.failure_step === step) {
    throw safeError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Injected commerce setup failure at " + step + ".",
    )
  }
}

export const createOrResolveCommerceSetupRecord = async (
  container: MedusaContainer,
  input: CommerceSetupWorkflowInput,
): Promise<{
  record: CommerceSetupRecord
  request: StoreCommerceSetupInput
  storeProfileId: string
}> => {
  const normalized = normalizeCommerceSetupRequest(input)
  const actorId =
    typeof input.actor_id === "string" && input.actor_id.trim()
      ? input.actor_id.trim()
      : null

  if (!actorId) {
    throw commerceSetupInvalid("A platform administrator actor is required.")
  }

  const { saas } = commerceReadinessServices(container)
  const sameKey = await saas.listStoreCommerceSetups({
    idempotency_key: normalized.idempotencyKey,
  })

  if (sameKey.length > 1) {
    throw commerceSetupInvalid("Commerce setup idempotency state is ambiguous.")
  }
  if (sameKey.length === 1) {
    if (
      sameKey[0].request_hash !== normalized.requestHash ||
      sameKey[0].store_profile_id !== normalized.storeProfileId
    ) {
      throw commerceSetupConflict(
        "The idempotency key was already used with different commerce setup input.",
      )
    }

    return {
      record: sameKey[0],
      request: normalized.request,
      storeProfileId: normalized.storeProfileId,
    }
  }

  const storeRecords = await saas.listStoreCommerceSetups(
    { store_profile_id: normalized.storeProfileId },
    { take: 100 },
  )
  const completed = storeRecords.filter(
    (entry: CommerceSetupRecord) => entry.status === "completed",
  )

  if (completed.length) {
    throw commerceSetupConflict(
      "Commerce setup is already complete for this Store. Replay its original idempotency key.",
    )
  }

  const active = storeRecords.filter((entry: CommerceSetupRecord) =>
    ["pending", "running", "failed", "requires_attention"].includes(
      entry.status,
    ),
  )

  if (active.length) {
    throw commerceSetupConflict(
      "This Store already has an unfinished commerce setup. Retry its original idempotency key.",
    )
  }

  try {
    const record = await saas.createStoreCommerceSetups({
      idempotency_key: normalized.idempotencyKey,
      request_hash: normalized.requestHash,
      store_profile_id: normalized.storeProfileId,
      status: "pending",
      current_step: "validate_store",
      request_snapshot: {
        store_profile_id: normalized.storeProfileId,
        shipping_option: normalized.request.shipping_option,
        provider_strategy: "platform_managed_manual_gate",
        pinned_policy: normalized.pinnedPolicy,
      },
      result_snapshot: null,
      resource_state: {},
      failure_code: null,
      failure_message_safe: null,
      retry_count: 0,
      actor_id: actorId,
      completed_at: null,
    })
    await recordCommerceSetupEvent(
      container,
      record,
      "started",
      "validate_store",
      { store_profile_id: normalized.storeProfileId },
    )
    return {
      record,
      request: normalized.request,
      storeProfileId: normalized.storeProfileId,
    }
  } catch {
    const [retryKey, retryStore] = await Promise.all([
      saas.listStoreCommerceSetups({
        idempotency_key: normalized.idempotencyKey,
      }),
      saas.listStoreCommerceSetups(
        { store_profile_id: normalized.storeProfileId },
        { take: 100 },
      ),
    ])

    if (retryKey.length === 1) {
      if (
        retryKey[0].request_hash !== normalized.requestHash ||
        retryKey[0].store_profile_id !== normalized.storeProfileId
      ) {
        throw commerceSetupConflict(
          "The idempotency key was already used with different commerce setup input.",
        )
      }
      return {
        record: retryKey[0],
        request: normalized.request,
        storeProfileId: normalized.storeProfileId,
      }
    }
    if (
      retryStore.some((entry: CommerceSetupRecord) =>
        ["pending", "running", "failed", "requires_attention"].includes(
          entry.status,
        ),
      )
    ) {
      throw commerceSetupConflict(
        "This Store already has an unfinished commerce setup.",
      )
    }
    if (
      retryStore.some(
        (entry: CommerceSetupRecord) => entry.status === "completed",
      )
    ) {
      throw commerceSetupConflict(
        "Commerce setup is already complete for this Store. Replay its original idempotency key.",
      )
    }
    throw commerceSetupConflict(
      "The commerce setup conflicts with an existing reservation.",
    )
  }
}

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const releaseLease = async (
  container: MedusaContainer,
  leaseKey: string,
  token: string,
): Promise<void> => {
  const { saas } = commerceReadinessServices(container)
  const pgConnection = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any
  const leases = await saas.listStoreCommerceSetupLeases({ lease_key: leaseKey })

  if (leases.length === 1 && leases[0].lease_token === token) {
    const current = await saas.retrieveStoreCommerceSetup(leases[0].setup_id)
    const now = await databaseClock(pgConnection)
    const expired =
      new Date(leases[0].expires_at).getTime() <= now.getTime()

    if (
      current.status !== "requires_attention" &&
      (!expired || current.status === "completed")
    ) {
      await saas.deleteStoreCommerceSetupLeases(leases[0].id)
    }
  }
}

async function transitionCommerceSetupLeaseForAttention(
  container: MedusaContainer,
  record: CommerceSetupRecord,
  observed: ObservedCommerceSetupLease,
  failure: { code: string; message: string } = {
    code: "commerce_setup_lease_expired",
    message:
      "Commerce setup requires operator attention because its execution lease expired.",
  },
): Promise<LeaseAttentionResult> {
  const { saas } = commerceReadinessServices(container)
  const pgConnection = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any
  const result = (await pgConnection.transaction(async (transaction: any) => {
    const setup = await transaction("store_commerce_setup")
      .where({ id: record.id })
      .whereNull("deleted_at")
      .forUpdate()
      .first()

    if (!setup) {
      return { outcome: "missing" as LeaseAttentionOutcome }
    }

    const lease = await transaction("store_commerce_setup_lease")
      .where({ lease_key: observed.leaseKey })
      .whereNull("deleted_at")
      .forUpdate()
      .first()
    const now = await databaseClock(transaction)

    if (observed.setupId !== setup.id) {
      return { outcome: "changed" as LeaseAttentionOutcome }
    }
    if (setup.status === "completed") {
      return { outcome: "completed" as LeaseAttentionOutcome }
    }
    if (setup.status === "cancelled") {
      return { outcome: "cancelled" as LeaseAttentionOutcome }
    }
    if (setup.status === "requires_attention") {
      return { outcome: "attention" as LeaseAttentionOutcome }
    }

    const sameObservedLease =
      lease?.setup_id === observed.setupId &&
      lease?.lease_token === observed.token
    const leaseIsActive =
      Boolean(lease) &&
      new Date(lease.expires_at).getTime() > now.getTime()

    if (sameObservedLease && leaseIsActive) {
      return { outcome: "active_expected" as LeaseAttentionOutcome }
    }
    if (observed.reason === "expired" && !sameObservedLease) {
      return { outcome: "changed" as LeaseAttentionOutcome }
    }
    if (
      observed.reason === "lost" &&
      leaseIsActive &&
      lease?.setup_id === setup.id
    ) {
      return { outcome: "active_replacement" as LeaseAttentionOutcome }
    }

    const readinessRows = await transaction("store_commerce_readiness")
      .where({ store_profile_id: setup.store_profile_id })
      .whereNull("deleted_at")
      .forUpdate()

    if (readinessRows.length !== 1) {
      throw commerceSetupInvalid(
        "Store commerce readiness is unavailable or ambiguous.",
      )
    }

    const setupUpdates = await transaction("store_commerce_setup")
      .where({ id: setup.id })
      .whereNull("deleted_at")
      .whereNotIn("status", [
        "completed",
        "cancelled",
        "requires_attention",
      ])
      .update({
        status: "requires_attention",
        failure_code: failure.code,
        failure_message_safe: failure.message,
        completed_at: null,
        updated_at: now,
      })

    if (Number(setupUpdates) !== 1) {
      return { outcome: "changed" as LeaseAttentionOutcome }
    }

    const readiness = readinessRows[0]
    await transaction("store_commerce_readiness")
      .where({ id: readiness.id })
      .whereNull("deleted_at")
      .update({
        status: "requires_attention",
        last_setup_id: setup.id,
        failure_code: failure.code,
        failure_message_safe: failure.message,
        validated_at: null,
        revision: Number(readiness.revision ?? 0) + 1,
        updated_at: now,
      })
    await transaction("store_commerce_setup_event").insert({
      id: generateEntityId(undefined, "stcsevt"),
      setup_id: setup.id,
      event_type: "requires_attention",
      step: setup.current_step,
      actor_id: setup.actor_id,
      safe_details: JSON.stringify({ failure_code: failure.code }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })

    return { outcome: "transitioned" as LeaseAttentionOutcome }
  })) as { outcome: LeaseAttentionOutcome }

  if (result.outcome === "missing") {
    return { outcome: result.outcome, record }
  }

  return {
    outcome: result.outcome,
    record: await saas.retrieveStoreCommerceSetup(record.id),
  }
}

function attentionConflict(): MedusaError {
  return commerceSetupConflict(
    "Commerce setup requires operator attention before it can run again.",
  )
}

function leaseOwnershipConflict(): MedusaError {
  return commerceSetupConflict(
    "Commerce setup execution ownership changed. Retry the status request.",
  )
}

const acquireLease = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
): Promise<{ token: string; completed: CommerceSetupRecord | null }> => {
  const { saas } = commerceReadinessServices(container)
  const pgConnection = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any
  const leaseKey = "store:" + record.store_profile_id
  const token = randomUUID()
  const deadline = Date.now() + WAIT_MILLISECONDS

  while (Date.now() < deadline) {
    const now = await databaseClock(pgConnection)

    try {
      await saas.createStoreCommerceSetupLeases({
        lease_key: leaseKey,
        setup_id: record.id,
        lease_token: token,
        expires_at: new Date(now.getTime() + LEASE_MILLISECONDS),
      })
      return { token, completed: null }
    } catch {
      const current = await saas.retrieveStoreCommerceSetup(record.id)

      if (current.request_hash !== record.request_hash) {
        throw commerceSetupConflict(
          "Commerce setup input changed while waiting for its result.",
        )
      }
      if (current.status === "completed") {
        return { token: "", completed: current }
      }
      if (current.status === "requires_attention") {
        throw attentionConflict()
      }
      if (current.status === "cancelled") {
        throw commerceSetupConflict("The commerce setup attempt was cancelled.")
      }

      const leases = await saas.listStoreCommerceSetupLeases({
        lease_key: leaseKey,
      })
      if (leases.length > 1) {
        throw commerceSetupInvalid("Commerce setup lease state is ambiguous.")
      }
      if (!leases.length) {
        throw commerceSetupConflict(
          "Commerce setup lease state changed while waiting. Retry the request.",
        )
      }
      const now = await databaseClock(pgConnection)
      if (new Date(leases[0].expires_at).getTime() <= now.getTime()) {
        const attention = await transitionCommerceSetupLeaseForAttention(
          container,
          current,
          {
            leaseKey,
            setupId: record.id,
            token: leases[0].lease_token,
            reason: "expired",
          },
        )
        if (attention.outcome === "completed") {
          return { token: "", completed: attention.record }
        }
        if (attention.outcome === "cancelled") {
          throw commerceSetupConflict(
            "The commerce setup attempt was cancelled.",
          )
        }
        if (
          attention.outcome === "transitioned" ||
          attention.outcome === "attention"
        ) {
          throw attentionConflict()
        }
        if (attention.outcome === "missing") {
          throw commerceSetupInvalid("The commerce setup attempt is unavailable.")
        }
      }
      await delay(POLL_MILLISECONDS)
    }
  }

  throw commerceSetupConflict(
    "Commerce setup is already running. Retry the status request.",
  )
}

export const withCommerceSetupLease = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  execute: (
    record: CommerceSetupRecord,
    guard: CommerceSetupLeaseGuard,
  ) => Promise<CommerceSetupRecord>,
): Promise<CommerceSetupRecord> => {
  const leaseKey = "store:" + record.store_profile_id
  const lease = await acquireLease(container, record)

  if (lease.completed) {
    return lease.completed
  }

  try {
    const current = await commerceReadinessServices(
      container,
    ).saas.retrieveStoreCommerceSetup(record.id)
    if (current.status === "completed") {
      return current
    }
    if (current.status === "requires_attention") {
      throw attentionConflict()
    }
    if (current.status === "cancelled") {
      throw commerceSetupConflict("The commerce setup attempt was cancelled.")
    }
    const execution: ActiveCommerceSetupLease = {
      setupId: current.id,
      storeProfileId: current.store_profile_id,
      leaseKey,
      token: lease.token,
    }
    const guard: CommerceSetupLeaseGuard = {
      assertActive: async (options) => {
        await runFencedLeaseOperation(container, options)
      },
    }

    return await activeCommerceSetupLease.run(execution, async () => {
      await guard.assertActive()
      return await execute(current, guard)
    })
  } finally {
    await releaseLease(container, leaseKey, lease.token).catch(() => null)
  }
}

export const serializeCommerceSetupStatus = (
  record: CommerceSetupRecord,
): Record<string, unknown> => ({
  id: record.id,
  store_profile_id: record.store_profile_id,
  status: record.status,
  current_step: record.current_step,
  retry_count: Number(record.retry_count ?? 0),
  failure_code: record.failure_code ?? null,
  failure_message: record.failure_message_safe ?? null,
  result:
    record.status === "completed" ? (record.result_snapshot ?? null) : null,
  created_at: record.created_at,
  updated_at: record.updated_at,
  completed_at: record.completed_at ?? null,
})

export const completedCommerceSetupResult = (
  record: CommerceSetupRecord,
): SafeCommerceSetupResult => {
  if (record.status !== "completed" || !record.result_snapshot) {
    throw commerceSetupInvalid("Commerce setup has no completed result.")
  }
  return record.result_snapshot as SafeCommerceSetupResult
}
