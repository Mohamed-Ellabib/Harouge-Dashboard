import type { MedusaContainer } from "@medusajs/framework/types"
import {
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createHash } from "crypto"
import { z } from "zod"

import { MARKETPLACE_MODULE } from "../../modules/marketplace"
import { SAAS_MODULE } from "../../modules/saas"
import {
  provisioningValueFingerprint,
  provisioningValueFingerprintMatches,
} from "../../workflows/provisioning-contract"
import {
  hashVendorPassword,
  MAX_VENDOR_PASSWORD_LENGTH,
  nextVendorSessionVersion,
} from "./vendor-auth"
import { normalizeEmail, recordOrNull } from "./vendors"
import { listStoreProfileStoreLinks } from "./legacy-vendor-compatibility"
import {
  acquireMerchantMembershipMutationLocks,
  merchantAccountMutationLock,
  merchantMembershipIdempotencyLock,
  merchantStoreMembershipMutationLock,
  withMerchantMembershipMutationLocks,
} from "./merchant-membership-locks"
import {
  hasActiveMerchantAccountCredential,
  hasValidMerchantAccountCredential,
} from "./merchant-account-credentials"

type RecordLike = Record<string, any>
type MembershipRole = "owner" | "manager"
type MembershipStatus = "active" | "disabled"
type AccountStatus = "active" | "disabled" | "unavailable"

const PAGE_SIZE = 250
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const safeAdminErrors = new WeakSet<object>()

const createMembershipSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((value) => normalizeEmail(value)),
    display_name: z.string().trim().min(2).max(120),
    role: z.enum(["owner", "manager"]),
    reuse_existing_account: z.boolean(),
    initial_password: z
      .string()
      .min(8)
      .max(MAX_VENDOR_PASSWORD_LENGTH)
      .optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (!input.reuse_existing_account && !input.initial_password) {
      context.addIssue({
        code: "custom",
        path: ["initial_password"],
        message: "An initial password is required for a new merchant account.",
      })
    }

    if (input.reuse_existing_account && input.initial_password !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["initial_password"],
        message: "Do not provide a password when reusing a merchant account.",
      })
    }
  })

const updateMembershipSchema = z
  .object({
    role: z.enum(["owner", "manager"]).optional(),
    status: z.enum(["active", "disabled"]).optional(),
  })
  .strict()
  .refine((input) => input.role !== undefined || input.status !== undefined, {
    message: "At least one supported membership field is required.",
  })

const resetPasswordSchema = z
  .object({
    temporary_password: z
      .string()
      .min(8)
      .max(MAX_VENDOR_PASSWORD_LENGTH),
  })
  .strict()

const accountStatusSchema = z
  .object({
    status: z.enum(["active", "disabled"]),
  })
  .strict()

const noBodySchema = z.object({}).strict()

const safeAdminError = (type: string, message: string) => {
  const error = new MedusaError(type, message)
  safeAdminErrors.add(error)
  return error
}

const invalid = (message: string) =>
  safeAdminError(MedusaError.Types.INVALID_DATA, message)

const conflict = (message: string) =>
  safeAdminError(MedusaError.Types.CONFLICT, message)

const notFound = (message: string) =>
  safeAdminError(MedusaError.Types.NOT_FOUND, message)

const unexpected = (message: string) =>
  safeAdminError(MedusaError.Types.UNEXPECTED_STATE, message)

const preserveSafeError = (error: unknown, fallback: string): never => {
  if (
    error instanceof MedusaError &&
    safeAdminErrors.has(error)
  ) {
    throw error
  }

  throw unexpected(fallback)
}

const hashTemporaryPassword = async (
  password: string,
  fallback: string,
): Promise<string> => {
  try {
    return await hashVendorPassword(password)
  } catch {
    throw unexpected(fallback)
  }
}

const fingerprintMembershipRequest = (value: unknown): string => {
  try {
    return provisioningValueFingerprint(value)
  } catch {
    throw unexpected("Merchant access idempotency is unavailable.")
  }
}

const membershipRequestFingerprintMatches = (
  value: unknown,
  storedHash: string,
): boolean => {
  try {
    return provisioningValueFingerprintMatches(value, storedHash)
  } catch {
    throw unexpected("Merchant access idempotency is unavailable.")
  }
}

const parseBody = <T>(schema: z.ZodType<T>, input: unknown, label: string): T => {
  const result = schema.safeParse(input ?? {})

  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue?.path?.length ? `${issue.path.join(".")}: ` : ""
    throw invalid(`${label} is invalid. ${field}${issue?.message ?? ""}`.trim())
  }

  return result.data
}

const parseIdentifier = (value: unknown, label: string): string => {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9_-]{1,160}$/.test(value)
  ) {
    throw invalid(`${label} is invalid.`)
  }

  return value
}

export const parsePlatformMembershipIdempotencyKey = (
  value: unknown,
): string => {
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw invalid("A single Idempotency-Key header is required.")
    }
    value = value[0]
  }

  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 200 ||
    !/^[A-Za-z0-9._:/-]+$/.test(value)
  ) {
    throw invalid("A valid Idempotency-Key header is required.")
  }

  return value
}

const servicesFor = (container: MedusaContainer) => ({
  saas: container.resolve(SAAS_MODULE) as any,
  marketplace: container.resolve(MARKETPLACE_MODULE) as any,
})

const listEvery = async <T>(
  listPage: (skip: number, take: number) => Promise<T[]>,
): Promise<T[]> => {
  const result: T[] = []
  let skip = 0

  while (true) {
    const page = await listPage(skip, PAGE_SIZE)
    result.push(...page)

    if (page.length < PAGE_SIZE) {
      return result
    }

    skip += page.length
  }
}

const allMemberships = async (container: MedusaContainer) => {
  const { saas } = servicesFor(container)
  return await listEvery<RecordLike>((skip, take) =>
    saas.listMerchantMemberships({}, { skip, take }),
  )
}

const allAccounts = async (container: MedusaContainer) => {
  const { marketplace } = servicesFor(container)
  return await listEvery<RecordLike>((skip, take) =>
    marketplace.listVendorMembers({}, { skip, take }),
  )
}

const displayNameFor = (account: RecordLike | undefined): string | null => {
  const metadata = recordOrNull(account?.metadata)
  const displayName = metadata?.display_name

  return typeof displayName === "string" && displayName.trim()
    ? displayName.trim()
    : null
}

const accountStatusFor = (
  account: RecordLike | undefined,
): AccountStatus => {
  if (!account) {
    return "unavailable"
  }

  return account.status === "active" ? "active" : "disabled"
}

const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex")

const membershipRequestFingerprintInput = (input: {
  store_profile_id: string
  email: string
  display_name: string
  role: MembershipRole
  reuse_existing_account: boolean
  initial_password: string | null
}) => ({
  version: 1,
  store_profile_id: input.store_profile_id,
  email: input.email,
  display_name: input.display_name,
  role: input.role,
  reuse_existing_account: input.reuse_existing_account,
  initial_password: input.initial_password,
})

type MembershipIdempotencyMarker = {
  request_hash: string
  membership_id: string
  store_profile_id: string
}

type PendingMembershipIdempotencyMarker = {
  key_hash: string
  request_hash: string
  store_profile_id: string
}

const pendingMembershipIdempotencyMarker = (
  account: RecordLike,
): PendingMembershipIdempotencyMarker | null => {
  const metadata = recordOrNull(account.metadata)
  const marker = recordOrNull(
    metadata?.platform_membership_pending_idempotency,
  )

  return marker &&
    typeof marker.key_hash === "string" &&
    typeof marker.request_hash === "string" &&
    typeof marker.store_profile_id === "string"
    ? (marker as PendingMembershipIdempotencyMarker)
    : null
}

const membershipIdempotencyMarkers = (
  account: RecordLike,
): Record<string, MembershipIdempotencyMarker> => {
  const metadata = recordOrNull(account.metadata)
  const raw = recordOrNull(metadata?.platform_membership_idempotency)

  if (!raw) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, MembershipIdempotencyMarker] => {
      const marker = recordOrNull(entry[1])
      return Boolean(
        /^[a-f0-9]{64}$/.test(entry[0]) &&
          marker &&
          typeof marker.request_hash === "string" &&
          typeof marker.membership_id === "string" &&
          typeof marker.store_profile_id === "string",
      )
    }),
  )
}

const recordMembershipIdempotency = async (
  container: MedusaContainer,
  account: RecordLike,
  keyHash: string,
  marker: MembershipIdempotencyMarker,
) => {
  const { marketplace } = servicesFor(container)
  const metadata = recordOrNull(account.metadata) ?? {}
  const metadataWithoutPendingMarker = { ...metadata }
  delete metadataWithoutPendingMarker.platform_membership_pending_idempotency
  const markers = membershipIdempotencyMarkers(account)
  const previous = markers[keyHash]

  if (
    previous &&
    (previous.request_hash !== marker.request_hash ||
      previous.membership_id !== marker.membership_id ||
      previous.store_profile_id !== marker.store_profile_id)
  ) {
    throw conflict("The Idempotency-Key was already used with different input.")
  }

  if (previous) {
    return account
  }

  if (Object.keys(markers).length >= 100) {
    throw conflict(
      "The merchant account has reached its membership operation history limit.",
    )
  }

  return await marketplace.updateVendorMembers({
    id: account.id,
    metadata: {
      ...metadataWithoutPendingMarker,
      platform_membership_idempotency: {
        ...markers,
        [keyHash]: marker,
      },
    },
  })
}

const getExactMembership = async (
  container: MedusaContainer,
  membershipId: string,
): Promise<RecordLike> => {
  const { saas } = servicesFor(container)
  const memberships = await saas.listMerchantMemberships({
    id: membershipId,
  })

  if (memberships.length !== 1 || memberships[0].id !== membershipId) {
    throw notFound("Merchant membership was not found.")
  }

  return memberships[0]
}

const getExactAccount = async (
  container: MedusaContainer,
  accountId: string,
): Promise<RecordLike> => {
  const { marketplace } = servicesFor(container)
  const accounts = await marketplace.listVendorMembers({ id: accountId })

  if (accounts.length !== 1 || accounts[0].id !== accountId) {
    throw notFound("Merchant account was not found.")
  }

  return accounts[0]
}

const getAccountForMembership = async (
  container: MedusaContainer,
  membershipId: string,
) => {
  const membership = await getExactMembership(container, membershipId)
  const account = await getExactAccount(
    container,
    membership.merchant_account_reference,
  )

  return { membership, account }
}

const requireActiveStoreGraph = async (
  container: MedusaContainer,
  storeProfileId: string,
) => {
  const { saas, marketplace } = servicesFor(container)
  const profiles = await saas.listStoreProfiles({ id: storeProfileId })
  const profile = profiles.find(
    (candidate: RecordLike) => candidate.id === storeProfileId,
  )

  if (!profile || profile.status !== "active") {
    throw notFound("An active Store was not found.")
  }

  const tenants = await saas.listTenants({ id: profile.tenant_id })
  const tenant = tenants.find(
    (candidate: RecordLike) => candidate.id === profile.tenant_id,
  )

  if (!tenant || tenant.status !== "active") {
    throw conflict("Merchant access is unavailable for this Store.")
  }

  if (
    typeof profile.legacy_vendor_id !== "string" ||
    !profile.legacy_vendor_id
  ) {
    throw conflict("Merchant access is unavailable for this Store.")
  }

  const vendors = await marketplace.listVendors({
    id: profile.legacy_vendor_id,
  })
  const vendor = vendors.find(
    (candidate: RecordLike) => candidate.id === profile.legacy_vendor_id,
  )

  if (!vendor || vendor.status !== "active") {
    throw conflict("Merchant access is unavailable for this Store.")
  }

  const profileLinks = await listStoreProfileStoreLinks(container, {
    store_profile_id: profile.id,
  })
  const reverseLinks =
    profileLinks.length === 1
      ? await listStoreProfileStoreLinks(container, {
          store_id: profileLinks[0].store_id,
        })
      : []

  if (
    profileLinks.length !== 1 ||
    reverseLinks.length !== 1 ||
    reverseLinks[0].store_profile_id !== profile.id
  ) {
    throw conflict("Merchant access is unavailable for this Store.")
  }

  const storeService = container.resolve(Modules.STORE) as any
  const medusaStore = await storeService
    .retrieveStore(profileLinks[0].store_id)
    .catch(() => null)

  if (!medusaStore?.id) {
    throw conflict("Merchant access is unavailable for this Store.")
  }

  return { profile, tenant, vendor, medusaStore }
}

const membershipAdminRow = async (
  container: MedusaContainer,
  membership: RecordLike,
  preloaded?: {
    accountById?: Map<string, RecordLike>
    profileById?: Map<string, RecordLike>
    vendorById?: Map<string, RecordLike>
    tenantById?: Map<string, RecordLike>
    accountStoreCount?: Map<string, number>
  },
) => {
  const { saas, marketplace } = servicesFor(container)
  const account =
    preloaded?.accountById?.get(membership.merchant_account_reference) ??
    (await marketplace
      .listVendorMembers({ id: membership.merchant_account_reference })
      .then((records: RecordLike[]) => records[0]))
  const profile =
    preloaded?.profileById?.get(membership.store_profile_id) ??
    (await saas
      .listStoreProfiles({ id: membership.store_profile_id })
      .then((records: RecordLike[]) => records[0]))
  const vendor = profile?.legacy_vendor_id
    ? (preloaded?.vendorById?.get(profile.legacy_vendor_id) ??
      (await marketplace
        .listVendors({ id: profile.legacy_vendor_id })
        .then((records: RecordLike[]) => records[0])))
    : undefined
  const tenant = profile?.tenant_id
    ? (preloaded?.tenantById?.get(profile.tenant_id) ??
      (await saas
        .listTenants({ id: profile.tenant_id })
        .then((records: RecordLike[]) => records[0])))
    : undefined
  const accountStatus = accountStatusFor(account)
  const effectiveAccess =
    membership.status === "active" &&
    hasActiveMerchantAccountCredential(account) &&
    profile?.status === "active" &&
    tenant?.status === "active" &&
    vendor?.status === "active"
      ? "active"
      : "disabled"
  const accountStoreCount =
    preloaded?.accountStoreCount?.get(
      membership.merchant_account_reference,
    ) ??
    (
      await saas.listMerchantMemberships({
        merchant_account_reference: membership.merchant_account_reference,
      })
    ).length

  return {
    id: membership.id,
    email:
      typeof account?.email === "string" ? normalizeEmail(account.email) : null,
    display_name: displayNameFor(account),
    role: membership.role as MembershipRole,
    status: membership.status as MembershipStatus,
    account_status: accountStatus,
    effective_access: effectiveAccess as MembershipStatus,
    joined_at: membership.created_at ?? null,
    store: {
      id: membership.store_profile_id,
      name:
        typeof vendor?.name === "string" && vendor.name.trim()
          ? vendor.name.trim()
          : (profile?.handle ?? null),
      handle: profile?.handle ?? null,
      status: profile?.status ?? "unavailable",
      plan_code: profile?.plan_code ?? null,
    },
    account_store_count: accountStoreCount,
  }
}

const parseIntegerQuery = (
  value: unknown,
  fallback: number,
  field: string,
  maximum?: number,
) => {
  if (value === undefined) {
    return fallback
  }

  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw invalid(`${field} is invalid.`)
  }

  const parsed = Number(value)
  if (parsed < 0 || (maximum !== undefined && parsed > maximum)) {
    throw invalid(`${field} is invalid.`)
  }

  return parsed
}

const oneQueryString = (value: unknown, field: string): string | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== "string") {
    throw invalid(`${field} is invalid.`)
  }

  return value
}

export const listPlatformMerchantMemberships = async (
  container: MedusaContainer,
  rawQuery: unknown,
) => {
  const query =
    rawQuery && typeof rawQuery === "object" && !Array.isArray(rawQuery)
      ? (rawQuery as Record<string, unknown>)
      : {}
  const allowedKeys = new Set([
    "q",
    "role",
    "status",
    "account_status",
    "effective_access",
    "offset",
    "limit",
  ])

  if (Object.keys(query).some((key) => !allowedKeys.has(key))) {
    throw invalid("The merchant membership query contains unsupported fields.")
  }

  const q = (oneQueryString(query.q, "q") ?? "").trim().toLowerCase()
  if (q.length > 120) {
    throw invalid("q is invalid.")
  }

  const role = oneQueryString(query.role, "role")
  const status = oneQueryString(query.status, "status")
  const accountStatus = oneQueryString(
    query.account_status,
    "account_status",
  )
  const effectiveAccess = oneQueryString(
    query.effective_access,
    "effective_access",
  )

  if (role && role !== "owner" && role !== "manager") {
    throw invalid("role is invalid.")
  }
  if (status && status !== "active" && status !== "disabled") {
    throw invalid("status is invalid.")
  }
  if (
    accountStatus &&
    accountStatus !== "active" &&
    accountStatus !== "disabled" &&
    accountStatus !== "unavailable"
  ) {
    throw invalid("account_status is invalid.")
  }
  if (
    effectiveAccess &&
    effectiveAccess !== "active" &&
    effectiveAccess !== "disabled"
  ) {
    throw invalid("effective_access is invalid.")
  }

  const offset = parseIntegerQuery(query.offset, 0, "offset")
  const limit = parseIntegerQuery(query.limit, DEFAULT_LIMIT, "limit", MAX_LIMIT)
  if (limit < 1) {
    throw invalid("limit is invalid.")
  }

  try {
    const { saas, marketplace } = servicesFor(container)
    const [memberships, accounts, profiles, vendors, tenants] =
      await Promise.all([
        allMemberships(container),
        allAccounts(container),
        listEvery<RecordLike>((skip, take) =>
          saas.listStoreProfiles({}, { skip, take }),
        ),
        listEvery<RecordLike>((skip, take) =>
          marketplace.listVendors({}, { skip, take }),
        ),
        listEvery<RecordLike>((skip, take) =>
          saas.listTenants({}, { skip, take }),
        ),
      ])
    const accountById = new Map(
      accounts.map((account) => [account.id, account]),
    )
    const profileById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    )
    const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]))
    const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]))
    const accountStoreCount = new Map<string, number>()
    const membershipById = new Map(
      memberships.map((membership) => [membership.id, membership]),
    )

    for (const membership of memberships) {
      const accountId = membership.merchant_account_reference
      accountStoreCount.set(accountId, (accountStoreCount.get(accountId) ?? 0) + 1)
    }

    const rows = await Promise.all(
      memberships.map((membership) =>
        membershipAdminRow(container, membership, {
          accountById,
          profileById,
          vendorById,
          tenantById,
          accountStoreCount,
        }),
      ),
    )
    const filtered = rows
      .filter((row) => !role || row.role === role)
      .filter((row) => !status || row.status === status)
      .filter((row) => !accountStatus || row.account_status === accountStatus)
      .filter(
        (row) =>
          !effectiveAccess || row.effective_access === effectiveAccess,
      )
      .filter((row) => {
        if (!q) {
          return true
        }

        return [
          row.email,
          row.display_name,
          row.store.name,
          row.store.handle,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      })
      .sort(
        (left, right) =>
          new Date(right.joined_at ?? 0).getTime() -
          new Date(left.joined_at ?? 0).getTime(),
      )
    const page = filtered.slice(offset, offset + limit)

    return {
      memberships: page,
      count: filtered.length,
      offset,
      limit,
      summary: {
        total_memberships: filtered.length,
        distinct_accounts: new Set(
          filtered
            .map(
              (row) =>
                membershipById.get(row.id)?.merchant_account_reference,
            )
            .filter(Boolean),
        ).size,
        active_access: filtered.filter(
          (row) => row.effective_access === "active",
        ).length,
        disabled_access: filtered.filter(
          (row) => row.effective_access === "disabled",
        ).length,
        owner_memberships: filtered.filter((row) => row.role === "owner")
          .length,
        manager_memberships: filtered.filter((row) => row.role === "manager")
          .length,
      },
    }
  } catch (error) {
    return preserveSafeError(
      error,
      "Merchant memberships could not be loaded.",
    )
  }
}

export const retrievePlatformMerchantMembership = async (
  container: MedusaContainer,
  membershipIdInput: unknown,
) => {
  const membershipId = parseIdentifier(
    membershipIdInput,
    "Membership identifier",
  )

  try {
    return await membershipAdminRow(
      container,
      await getExactMembership(container, membershipId),
    )
  } catch (error) {
    return preserveSafeError(
      error,
      "Merchant access could not be retrieved.",
    )
  }
}

export const createPlatformMerchantMembership = async (
  container: MedusaContainer,
  storeProfileIdInput: unknown,
  rawBody: unknown,
  idempotencyKeyInput: unknown,
) => {
  const storeProfileId = parseIdentifier(
    storeProfileIdInput,
    "Store identifier",
  )
  const input = parseBody(
    createMembershipSchema,
    rawBody,
    "Merchant membership request",
  )
  const idempotencyKey = parsePlatformMembershipIdempotencyKey(
    idempotencyKeyInput,
  )
  const idempotencyKeyHash = sha256(idempotencyKey)
  const requestFingerprintInput = membershipRequestFingerprintInput({
    store_profile_id: storeProfileId,
    email: input.email,
    display_name: input.display_name,
    role: input.role,
    reuse_existing_account: input.reuse_existing_account,
    initial_password: input.initial_password ?? null,
  })
  const requestHash = fingerprintMembershipRequest(requestFingerprintInput)
  const passwordHash = input.reuse_existing_account
    ? null
    : await hashTemporaryPassword(
        input.initial_password as string,
        "Merchant credentials could not be prepared.",
      )

  try {
    return await withMerchantMembershipMutationLocks(
      container,
      [
        merchantMembershipIdempotencyLock(idempotencyKeyHash),
        merchantAccountMutationLock(input.email),
        merchantStoreMembershipMutationLock(storeProfileId),
      ],
      async () => {
        const { profile, vendor } = await requireActiveStoreGraph(
          container,
          storeProfileId,
        )
        const { saas, marketplace } = servicesFor(container)
        const allCurrentAccounts = await allAccounts(container)
        const markerAccounts = allCurrentAccounts.filter(
          (account) =>
            membershipIdempotencyMarkers(account)[idempotencyKeyHash],
        )

        if (markerAccounts.length > 1) {
          throw conflict("The Idempotency-Key state is ambiguous.")
        }

        if (markerAccounts.length === 1) {
          const account = markerAccounts[0]
          const marker =
            membershipIdempotencyMarkers(account)[idempotencyKeyHash]

          if (
            !membershipRequestFingerprintMatches(
              requestFingerprintInput,
              marker.request_hash,
            )
          ) {
            throw conflict(
              "The Idempotency-Key was already used with different input.",
            )
          }

          const membership = await getExactMembership(
            container,
            marker.membership_id,
          )
          if (
            marker.store_profile_id !== storeProfileId ||
            membership.store_profile_id !== storeProfileId ||
            membership.merchant_account_reference !== account.id ||
            membership.role !== input.role ||
            membership.status !== "active" ||
            normalizeEmail(account.email) !== input.email ||
            displayNameFor(account) !== input.display_name ||
            !hasActiveMerchantAccountCredential(account)
          ) {
            throw conflict(
              "The existing idempotent membership no longer matches the request.",
            )
          }

          return {
            membership: await membershipAdminRow(container, membership),
            replayed: true,
            created: false,
          }
        }

        const pendingAccounts = allCurrentAccounts.filter(
          (account) =>
            pendingMembershipIdempotencyMarker(account)?.key_hash ===
            idempotencyKeyHash,
        )

        if (pendingAccounts.length > 1) {
          throw conflict("The Idempotency-Key state is ambiguous.")
        }

        if (pendingAccounts.length === 1) {
          const account = pendingAccounts[0]
          const pending = pendingMembershipIdempotencyMarker(account)!

          if (
            pending.store_profile_id !== storeProfileId ||
            !membershipRequestFingerprintMatches(
              requestFingerprintInput,
              pending.request_hash,
            )
          ) {
            throw conflict(
              "The Idempotency-Key was already used with different input.",
            )
          }

          const pendingMemberships = await saas.listMerchantMemberships({
            store_profile_id: storeProfileId,
            merchant_account_reference: account.id,
          })

          if (
            pendingMemberships.length > 1 ||
            account.vendor_id !== vendor.id ||
            normalizeEmail(account.email) !== input.email ||
            displayNameFor(account) !== input.display_name ||
            !hasActiveMerchantAccountCredential(account)
          ) {
            throw conflict(
              "The incomplete idempotent membership requires operator review.",
            )
          }

          if (!pendingMemberships.length) {
            const recoveredMembership =
              await saas.createMerchantMemberships({
                store_profile_id: storeProfileId,
                merchant_account_reference: account.id,
                role: input.role,
                status: "active",
              })

            await recordMembershipIdempotency(
              container,
              account,
              idempotencyKeyHash,
              {
                request_hash: requestHash,
                membership_id: recoveredMembership.id,
                store_profile_id: storeProfileId,
              },
            )

            return {
              membership: await membershipAdminRow(
                container,
                recoveredMembership,
              ),
              replayed: false,
              created: true,
              recovered: true,
            }
          }

          const pendingMembership = pendingMemberships[0]

          if (
            pendingMembership.role !== input.role ||
            pendingMembership.status !== "active"
          ) {
            throw conflict(
              "The incomplete idempotent membership requires operator review.",
            )
          }

          await recordMembershipIdempotency(
            container,
            account,
            idempotencyKeyHash,
            {
              request_hash: requestHash,
              membership_id: pendingMembership.id,
              store_profile_id: storeProfileId,
            },
          )

          return {
            membership: await membershipAdminRow(
              container,
              pendingMembership,
            ),
            replayed: true,
            created: false,
          }
        }

        const accounts = allCurrentAccounts.filter(
          (account) => normalizeEmail(account.email) === input.email,
        )
        let account: RecordLike
        let definitelyNewAccount = false

        if (accounts.length) {
          if (accounts.length !== 1) {
            throw conflict(
              "The reusable merchant account is unavailable or ambiguous.",
            )
          }

          account = accounts[0]
          const existingMemberships = await saas.listMerchantMemberships({
            store_profile_id: profile.id,
            merchant_account_reference: account.id,
          })
          const existing = existingMemberships[0]

          if (
            input.reuse_existing_account &&
            existingMemberships.length === 1 &&
            existing.role === input.role &&
            existing.status === "active" &&
            hasActiveMerchantAccountCredential(account) &&
            displayNameFor(account) === input.display_name
          ) {
            await recordMembershipIdempotency(
              container,
              account,
              idempotencyKeyHash,
              {
                request_hash: requestHash,
                membership_id: existing.id,
                store_profile_id: profile.id,
              },
            )
            return {
              membership: await membershipAdminRow(container, existing),
              replayed: true,
              created: false,
            }
          }

          if (!input.reuse_existing_account) {
            throw conflict(
              "The merchant email already exists; explicit account reuse is required.",
            )
          }

          if (
            !hasActiveMerchantAccountCredential(account)
          ) {
            throw conflict(
              "The reusable merchant account is unavailable or ambiguous.",
            )
          }

          if (displayNameFor(account) !== input.display_name) {
            throw conflict(
              "The reusable merchant account details do not match.",
            )
          }

          if (existingMemberships.length) {
            throw conflict(
              "The Store membership already exists with different access settings.",
            )
          }
        } else {
          if (input.reuse_existing_account) {
            throw conflict(
              "The reusable merchant account is unavailable or ambiguous.",
            )
          }

          account = await marketplace.createVendorMembers({
            vendor_id: vendor.id,
            user_id: null,
            email: input.email,
            role: input.role,
            status: "active",
            metadata: {
              display_name: input.display_name,
              password_hash: passwordHash,
              password_change_required: true,
              session_version: 0,
              platform_membership_pending_idempotency: {
                key_hash: idempotencyKeyHash,
                request_hash: requestHash,
                store_profile_id: profile.id,
              },
            },
          })
          definitelyNewAccount = true
        }

        let membershipCreated = false
        try {
          const membership = await saas.createMerchantMemberships({
            store_profile_id: profile.id,
            merchant_account_reference: account.id,
            role: input.role,
            status: "active",
          })
          membershipCreated = true

          account = await recordMembershipIdempotency(
            container,
            account,
            idempotencyKeyHash,
            {
              request_hash: requestHash,
              membership_id: membership.id,
              store_profile_id: profile.id,
            },
          )

          return {
            membership: await membershipAdminRow(container, membership),
            replayed: false,
            created: true,
          }
        } catch (error) {
          if (definitelyNewAccount && !membershipCreated) {
            try {
              await marketplace.deleteVendorMembers(account.id)
            } catch {
              throw unexpected(
                "Merchant access could not be completed safely. Operator review is required.",
              )
            }
          }

          throw error
        }
      },
    )
  } catch (error) {
    return preserveSafeError(
      error,
      "Merchant access could not be created.",
    )
  }
}

const assertMembershipOwnerInvariant = async (
  container: MedusaContainer,
  membership: RecordLike,
  nextRole: MembershipRole,
  nextStatus: MembershipStatus,
) => {
  if (
    membership.role !== "owner" ||
    membership.status !== "active" ||
    (nextRole === "owner" && nextStatus === "active")
  ) {
    return
  }

  const currentAccount = await getExactAccount(
    container,
    membership.merchant_account_reference,
  ).catch(() => null)

  if (!hasActiveMerchantAccountCredential(currentAccount)) {
    return
  }

  const { saas } = servicesFor(container)
  const storeMemberships = await saas.listMerchantMemberships({
    store_profile_id: membership.store_profile_id,
  })
  const otherOwnerAccountIds = new Set(
    storeMemberships
      .filter(
        (candidate: RecordLike) =>
          candidate.id !== membership.id &&
          candidate.role === "owner" &&
          candidate.status === "active",
      )
      .map(
        (candidate: RecordLike) => candidate.merchant_account_reference,
      ),
  )
  const otherActiveOwner = (await allAccounts(container)).some(
    (account) =>
      otherOwnerAccountIds.has(account.id) &&
      hasActiveMerchantAccountCredential(account),
  )

  if (!otherActiveOwner) {
    throw conflict("A Store must retain at least one active owner.")
  }
}

export const updatePlatformMerchantMembership = async (
  container: MedusaContainer,
  membershipIdInput: unknown,
  rawBody: unknown,
) => {
  const membershipId = parseIdentifier(
    membershipIdInput,
    "Membership identifier",
  )
  const input = parseBody(
    updateMembershipSchema,
    rawBody,
    "Merchant membership update",
  )

  try {
    const initial = await getExactMembership(container, membershipId)

    return await withMerchantMembershipMutationLocks(
      container,
      [merchantStoreMembershipMutationLock(initial.store_profile_id)],
      async () => {
        const { saas } = servicesFor(container)
        const current = await getExactMembership(container, membershipId)
        const nextRole = (input.role ?? current.role) as MembershipRole
        const nextStatus = (input.status ?? current.status) as MembershipStatus

        if (current.status === "disabled" && nextStatus === "active") {
          const account = await getExactAccount(
            container,
            current.merchant_account_reference,
          )

          if (!hasActiveMerchantAccountCredential(account)) {
            throw conflict(
              "The Store membership cannot be activated while its merchant account is unavailable.",
            )
          }

          await requireActiveStoreGraph(
            container,
            current.store_profile_id,
          )
        }

        await assertMembershipOwnerInvariant(
          container,
          current,
          nextRole,
          nextStatus,
        )

        const updated =
          nextRole === current.role && nextStatus === current.status
            ? current
            : await saas.updateMerchantMemberships({
                id: current.id,
                role: nextRole,
                status: nextStatus,
              })

        // Store-scoped access changes deliberately do not revoke the account's
        // sessions for its other Stores. Merchant context rechecks membership.
        return {
          membership: await membershipAdminRow(container, updated),
          scope: "store" as const,
        }
      },
    )
  } catch (error) {
    return preserveSafeError(
      error,
      "Merchant access could not be updated.",
    )
  }
}

const safeAccount = (account: RecordLike) => ({
  email: normalizeEmail(account.email),
  display_name: displayNameFor(account),
  status: accountStatusFor(account),
})

const accountStoreCount = async (
  container: MedusaContainer,
  accountId: string,
) => {
  const { saas } = servicesFor(container)
  return (
    await saas.listMerchantMemberships({
      merchant_account_reference: accountId,
    })
  ).length
}

export const revokePlatformMerchantAccountSessions = async (
  container: MedusaContainer,
  membershipIdInput: unknown,
  rawBody: unknown,
) => {
  const membershipId = parseIdentifier(
    membershipIdInput,
    "Membership identifier",
  )
  parseBody(noBodySchema, rawBody, "Session revocation request")

  try {
    const initial = await getAccountForMembership(container, membershipId)
    const email = normalizeEmail(initial.account.email)

    return await withMerchantMembershipMutationLocks(
      container,
      [merchantAccountMutationLock(email)],
      async () => {
        const { marketplace } = servicesFor(container)
        const { account } = await getAccountForMembership(
          container,
          membershipId,
        )
        const metadata = recordOrNull(account.metadata) ?? {}
        const updated = await marketplace.updateVendorMembers({
          id: account.id,
          metadata: {
            ...metadata,
            session_version: nextVendorSessionVersion(metadata),
          },
        })

        return {
          account: safeAccount(updated),
          scope: "global" as const,
          affected_store_count: await accountStoreCount(container, account.id),
        }
      },
    )
  } catch (error) {
    return preserveSafeError(error, "Merchant sessions could not be revoked.")
  }
}

export const resetPlatformMerchantAccountPassword = async (
  container: MedusaContainer,
  membershipIdInput: unknown,
  rawBody: unknown,
) => {
  const membershipId = parseIdentifier(
    membershipIdInput,
    "Membership identifier",
  )
  const input = parseBody(
    resetPasswordSchema,
    rawBody,
    "Password reset request",
  )
  const passwordHash = await hashTemporaryPassword(
    input.temporary_password,
    "The temporary merchant credential could not be prepared.",
  )

  try {
    const initial = await getAccountForMembership(container, membershipId)
    const email = normalizeEmail(initial.account.email)

    return await withMerchantMembershipMutationLocks(
      container,
      [merchantAccountMutationLock(email)],
      async () => {
        const { marketplace } = servicesFor(container)
        const { account } = await getAccountForMembership(
          container,
          membershipId,
        )
        const metadata = recordOrNull(account.metadata) ?? {}
        const updated = await marketplace.updateVendorMembers({
          id: account.id,
          metadata: {
            ...metadata,
            password_hash: passwordHash,
            password_change_required: true,
            session_version: nextVendorSessionVersion(metadata),
          },
        })

        return {
          account: safeAccount(updated),
          scope: "global" as const,
          affected_store_count: await accountStoreCount(container, account.id),
        }
      },
    )
  } catch (error) {
    return preserveSafeError(
      error,
      "The merchant password could not be reset.",
    )
  }
}

const assertAccountDisableOwnerInvariant = async (
  container: MedusaContainer,
  account: RecordLike,
  accountMemberships: RecordLike[],
) => {
  if (!hasActiveMerchantAccountCredential(account)) {
    return
  }

  const ownerStoreIds = accountMemberships
    .filter(
      (membership) =>
        membership.role === "owner" && membership.status === "active",
    )
    .map((membership) => membership.store_profile_id)

  if (!ownerStoreIds.length) {
    return
  }

  const { saas } = servicesFor(container)
  const allStoreMemberships = (
    await Promise.all(
      ownerStoreIds.map((storeProfileId) =>
        saas.listMerchantMemberships({ store_profile_id: storeProfileId }),
      ),
    )
  ).flat()
  const otherOwnerAccountIds = [
    ...new Set(
      allStoreMemberships
        .filter(
          (membership: RecordLike) =>
            membership.merchant_account_reference !== account.id &&
            membership.role === "owner" &&
            membership.status === "active",
        )
        .map((membership: RecordLike) => membership.merchant_account_reference),
    ),
  ]
  const accounts = await allAccounts(container)
  const activeAccountIds = new Set(
    accounts
      .filter(
        (candidate) =>
          otherOwnerAccountIds.includes(candidate.id) &&
          hasActiveMerchantAccountCredential(candidate),
      )
      .map((candidate) => candidate.id),
  )

  const wouldLoseOwner = ownerStoreIds.some((storeProfileId) =>
    !allStoreMemberships.some(
      (membership: RecordLike) =>
        membership.store_profile_id === storeProfileId &&
        membership.merchant_account_reference !== account.id &&
        membership.role === "owner" &&
        membership.status === "active" &&
        activeAccountIds.has(membership.merchant_account_reference),
    ),
  )

  if (wouldLoseOwner) {
    throw conflict(
      "The merchant account is the last active owner of one or more Stores.",
    )
  }
}

export const updatePlatformMerchantAccountStatus = async (
  container: MedusaContainer,
  membershipIdInput: unknown,
  rawBody: unknown,
) => {
  const membershipId = parseIdentifier(
    membershipIdInput,
    "Membership identifier",
  )
  const input = parseBody(
    accountStatusSchema,
    rawBody,
    "Merchant account status update",
  )

  try {
    const initial = await getAccountForMembership(container, membershipId)
    const { saas } = servicesFor(container)
    const accountLock = merchantAccountMutationLock(
      normalizeEmail(initial.account.email),
    )

    return await withMerchantMembershipMutationLocks(
      container,
      [accountLock],
      async (transaction) => {
        const { marketplace } = servicesFor(container)
        const { account } = await getAccountForMembership(
          container,
          membershipId,
        )
        const membershipSnapshot = await saas.listMerchantMemberships({
          merchant_account_reference: account.id,
        })

        await acquireMerchantMembershipMutationLocks(
          transaction,
          membershipSnapshot.map((membership: RecordLike) =>
            merchantStoreMembershipMutationLock(
              membership.store_profile_id,
            ),
          ),
        )

        // Store-scoped PATCH can change role/status without the account lock.
        // Re-read after every affected Store lock is held.
        const accountMemberships = await saas.listMerchantMemberships({
          merchant_account_reference: account.id,
        })

        if (input.status === "disabled" && account.status !== "disabled") {
          await assertAccountDisableOwnerInvariant(
            container,
            account,
            accountMemberships,
          )
        }

        if (
          input.status === "active" &&
          !hasValidMerchantAccountCredential(account)
        ) {
          throw conflict(
            "The merchant account cannot be activated without a valid credential.",
          )
        }

        const metadata = recordOrNull(account.metadata) ?? {}
        const updated = await marketplace.updateVendorMembers({
          id: account.id,
          status: input.status,
          metadata: {
            ...metadata,
            session_version: nextVendorSessionVersion(metadata),
          },
        })

        return {
          account: safeAccount(updated),
          scope: "global" as const,
          affected_store_count: accountMemberships.length,
        }
      },
    )
  } catch (error) {
    return preserveSafeError(
      error,
      "Merchant account status could not be updated.",
    )
  }
}
