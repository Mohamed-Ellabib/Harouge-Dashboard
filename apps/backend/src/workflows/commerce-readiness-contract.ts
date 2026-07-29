import { createHash } from "crypto"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { normalizeIdempotencyKey } from "./provisioning-contract"

export const COMMERCE_GATE_FULFILLMENT_PROVIDER_ID = "manual_manual"
export const COMMERCE_GATE_PAYMENT_PROVIDER_ID = "pp_system_default"

export const commerceFulfillmentSetName = (storeProfileId: string): string =>
  "LabibTech delivery " + storeProfileId

export const commerceServiceZoneName = (storeProfileId: string): string =>
  "LabibTech service zone " + storeProfileId

export const commerceShippingOptionCode = (storeProfileId: string): string =>
  "labibtech-" + storeProfileId.toLowerCase() + "-standard"

const shippingOptionSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(2).max(240).optional(),
    amount: z.number().int().min(0).max(1_000_000_000),
  })
  .strict()

const setupSchema = z
  .object({
    shipping_option: shippingOptionSchema,
  })
  .strict()

export type StoreCommerceSetupInput = z.infer<typeof setupSchema>

const pinnedPolicySchema = z
  .object({
    version: z.literal(1),
    provisioning_id: z.string().trim().min(1).max(255),
    tenant_id: z.string().trim().min(1).max(255),
    store_profile_id: z.string().trim().min(1).max(255),
    medusa_store_id: z.string().trim().min(1).max(255),
    plan_code: z.literal("professional_commerce"),
    region_id: z.string().trim().min(1).max(255),
    stock_location_id: z.string().trim().min(1).max(255),
    sales_channel_id: z.string().trim().min(1).max(255),
    currency_code: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toLowerCase()),
    countries: z
      .array(
        z
          .string()
          .trim()
          .length(2)
          .transform((value) => value.toLowerCase()),
      )
      .min(1)
      .max(25),
    fulfillment_provider_id: z.string().trim().min(1).max(255),
    payment_provider_id: z.string().trim().min(1).max(255),
  })
  .strict()

export type CommerceSetupPinnedPolicy = z.infer<typeof pinnedPolicySchema>

export type CommerceSetupStep =
  | "validate_store"
  | "fulfillment_provider"
  | "shipping_profile"
  | "fulfillment_set"
  | "shipping_option"
  | "store_allowlist"
  | "graph_validation"

export type CommerceSetupWorkflowInput = {
  idempotency_key: string
  actor_id: string
  store_profile_id: string
  request: unknown
  failure_step?: CommerceSetupStep
  /** Server-derived only. Public callers must not be allowed to select it. */
  pinned_policy?: CommerceSetupPinnedPolicy
}

export type SafeCommerceSetupResult = {
  setup_id: string
  status: "completed"
  readiness_status: "ready"
  store_profile_id: string
  medusa_store_id: string
  region_id: string
  stock_location_id: string
  fulfillment_provider_id: string
  shipping_profile_id: string
  fulfillment_set_id: string
  service_zone_id: string
  shipping_option_ids: string[]
  currency_code: string
  countries: string[]
  created_resources: Record<string, "created" | "reused">
}

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message)

export const normalizeStoreProfileId = (value: unknown): string => {
  const normalized = typeof value === "string" ? value.trim() : ""

  if (!/^stprof_[a-zA-Z0-9]+$/.test(normalized)) {
    throw invalid("A valid StoreProfile identifier is required.")
  }

  return normalized
}

export const normalizeCommerceSetupInput = (
  value: unknown,
): StoreCommerceSetupInput => {
  const parsed = setupSchema.safeParse(value)

  if (!parsed.success) {
    throw invalid(
      parsed.error.issues[0]?.message ?? "Commerce setup input is invalid.",
    )
  }

  return parsed.data
}

export const normalizeCommerceSetupPinnedPolicy = (
  value: unknown,
): CommerceSetupPinnedPolicy => {
  const parsed = pinnedPolicySchema.safeParse(value)

  if (!parsed.success) {
    throw invalid("The permanent Store commerce policy is unavailable.")
  }

  return {
    ...parsed.data,
    countries: [...new Set(parsed.data.countries)].sort(),
  }
}

export const sameCommerceSetupPinnedPolicy = (
  left: unknown,
  right: unknown,
): boolean => {
  try {
    return (
      JSON.stringify(normalizeCommerceSetupPinnedPolicy(left)) ===
      JSON.stringify(normalizeCommerceSetupPinnedPolicy(right))
    )
  } catch {
    return false
  }
}

export const commerceSetupRequestHash = (
  storeProfileId: string,
  input: StoreCommerceSetupInput,
  pinnedPolicy: CommerceSetupPinnedPolicy,
): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        store_profile_id: storeProfileId,
        shipping_option: input.shipping_option,
        pinned_policy: normalizeCommerceSetupPinnedPolicy(pinnedPolicy),
      }),
    )
    .digest("hex")

export const normalizeCommerceSetupRequest = (input: {
  idempotency_key: unknown
  store_profile_id: unknown
  request: unknown
  pinned_policy?: unknown
}) => {
  const storeProfileId = normalizeStoreProfileId(input.store_profile_id)
  const request = normalizeCommerceSetupInput(input.request)
  const pinnedPolicy = normalizeCommerceSetupPinnedPolicy(input.pinned_policy)

  if (pinnedPolicy.store_profile_id !== storeProfileId) {
    throw invalid("The permanent Store commerce policy is incompatible.")
  }

  return {
    idempotencyKey: normalizeIdempotencyKey(input.idempotency_key),
    storeProfileId,
    request,
    pinnedPolicy,
    requestHash: commerceSetupRequestHash(
      storeProfileId,
      request,
      pinnedPolicy,
    ),
  }
}

export const safeCommerceSetupError = (
  error: unknown,
): { code: string; message: string } => {
  if (
    error instanceof MedusaError &&
    (error as MedusaError & { commerce_setup_safe?: boolean })
      .commerce_setup_safe === true
  ) {
    return {
      code: String(error.type ?? "commerce_setup_failed"),
      message: error.message.slice(0, 500),
    }
  }

  return {
    code: "commerce_setup_failed",
    message: "Commerce setup failed at the recorded step.",
  }
}
