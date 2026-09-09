import type {
  CommerceSetupRequest,
  CommerceSetupResult,
  CreatePlatformMerchantMembershipRequest,
  CreatePlatformMerchantMembershipResult,
  PlatformMerchantAccessStatus,
  PlatformMerchantAccountMutationResult,
  PlatformMerchantMembership,
  PlatformMerchantMembershipList,
  PlatformMerchantMembershipMutationResult,
  PlatformMerchantMembershipQuery,
  PlatformPortfolio,
  PlatformSettings,
  PlatformSettingsRecord,
  PlatformStoreConfiguration,
  PlatformStoreConfigurationRecord,
  PlatformStoreConfigurationUpdate,
  PlatformStorefrontBankTransfer,
  PlatformStorefrontDocument,
  PlatformStorefrontRecord,
  PlatformStorefrontStarterResult,
  PlatformStorefrontTemplateCatalog,
  PlatformStorefrontPreview,
  PlatformVendor,
  ProvisionStoreRequest,
  ProvisionStoreResult,
  ProvisioningStatus,
  UpdatePlatformMerchantMembershipRequest,
  CreatePlatformUserRequest,
  PlatformUser,
  UpdatePlatformUserRequest,
} from "./types"

import { restorePlatformSession } from "../auth/platform-session"

type ErrorPayload = {
  message?: string
}

export async function platformRequest<T>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const request = () => fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  })
  let response = await request()
  if (response.status === 401 && !init.signal?.aborted && await restorePlatformSession()) {
    response = await request()
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ErrorPayload | null
    const error = new Error(payload?.message || `Platform request failed (${response.status}).`)
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function provisioningForVendor(
  vendor: PlatformVendor,
): Promise<ProvisioningStatus | null> {
  const provisioningId = vendor.metadata?.saas_provisioning_id

  if (typeof provisioningId !== "string" || !provisioningId) {
    return null
  }

  try {
    const payload = await platformRequest<{ provisioning: ProvisioningStatus }>(
      `/admin/saas/provisioning/${encodeURIComponent(provisioningId)}`,
    )
    return payload.provisioning
  } catch {
    return null
  }
}

export async function listPlatformVendors(query = ""): Promise<PlatformVendor[]> {
  const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""
  const payload = await platformRequest<{ vendors: PlatformVendor[] }>(
    `/admin/vendors${search}`,
  )
  const provisioning = await Promise.all(
    payload.vendors.map((vendor) => provisioningForVendor(vendor)),
  )

  return payload.vendors.map((vendor, index) => ({
    ...vendor,
    domains: vendor.domains ?? [],
    members: vendor.members ?? [],
    provisioning: provisioning[index],
  }))
}

export async function listPlatformPortfolio(query = ""): Promise<PlatformPortfolio> {
  const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""
  return await platformRequest<PlatformPortfolio>(`/admin/saas/portfolio${search}`)
}

export async function getPlatformSettings(
  signal?: AbortSignal,
): Promise<PlatformSettingsRecord> {
  return await platformRequest<PlatformSettingsRecord>("/admin/saas/settings", {
    signal,
  })
}

export async function savePlatformSettings(
  settings: PlatformSettings,
  revision: number,
): Promise<PlatformSettingsRecord> {
  return await platformRequest<PlatformSettingsRecord>("/admin/saas/settings", {
    method: "PUT",
    body: JSON.stringify({ settings, revision }),
  })
}

export async function listPlatformUsers(signal?: AbortSignal): Promise<PlatformUser[]> {
  const payload = await platformRequest<{ users: PlatformUser[] }>(
    "/admin/saas/platform-users",
    { signal },
  )
  return payload.users
}

export async function createPlatformUser(
  request: CreatePlatformUserRequest,
): Promise<PlatformUser> {
  const payload = await platformRequest<{ user: PlatformUser }>(
    "/admin/saas/platform-users",
    { method: "POST", body: JSON.stringify(request) },
  )
  return payload.user
}

export async function updatePlatformUser(
  id: string,
  request: UpdatePlatformUserRequest,
): Promise<PlatformUser> {
  const payload = await platformRequest<{ user: PlatformUser }>(
    `/admin/saas/platform-users/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(request) },
  )
  return payload.user
}

export async function deletePlatformUser(id: string): Promise<void> {
  await platformRequest(`/admin/saas/platform-users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export async function resetPlatformUserPassword(
  id: string,
  password: string,
): Promise<void> {
  await platformRequest(
    `/admin/saas/platform-users/${encodeURIComponent(id)}/reset-password`,
    { method: "POST", body: JSON.stringify({ password }) },
  )
}

const fileToBase64 = async (file: File): Promise<string> => {
  const buffer = new Uint8Array(await file.arrayBuffer())
  let binary = ""
  for (let index = 0; index < buffer.length; index += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

export async function uploadPlatformImage(file: File): Promise<string> {
  const payload = await platformRequest<{ file: { id: string; url: string } }>(
    "/admin/saas/uploads",
    {
      method: "POST",
      body: JSON.stringify({
        file: {
          filename: file.name,
          mime_type: file.type,
          content: await fileToBase64(file),
        },
      }),
    },
  )
  return payload.file.url
}

export async function getPlatformStoreConfiguration(
  storeProfileId: string,
  signal?: AbortSignal,
): Promise<PlatformStoreConfigurationRecord> {
  return await platformRequest<PlatformStoreConfigurationRecord>(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/configuration`,
    { signal },
  )
}

export async function savePlatformStoreConfiguration(
  storeProfileId: string,
  configuration: PlatformStoreConfigurationUpdate,
  revision: number,
): Promise<PlatformStoreConfigurationRecord> {
  return await platformRequest<PlatformStoreConfigurationRecord>(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/configuration`,
    {
      method: "PUT",
      body: JSON.stringify({ configuration, revision }),
    },
  )
}

export async function listPlatformStorefrontTemplates(
  signal?: AbortSignal,
): Promise<PlatformStorefrontTemplateCatalog> {
  return await platformRequest<PlatformStorefrontTemplateCatalog>(
    "/admin/saas/storefront-templates",
    { signal },
  )
}

export async function getPlatformStorefront(
  storeProfileId: string,
  signal?: AbortSignal,
): Promise<PlatformStorefrontRecord> {
  return await platformRequest<PlatformStorefrontRecord>(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/storefront`,
    { signal },
  )
}

export async function savePlatformStorefrontDraft(
  storeProfileId: string,
  revision: number,
  document: PlatformStorefrontDocument,
  bankTransfer: PlatformStorefrontBankTransfer,
): Promise<PlatformStorefrontRecord> {
  return await platformRequest<PlatformStorefrontRecord>(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/storefront/draft`,
    {
      method: "PUT",
      body: JSON.stringify({
        revision,
        document,
        bank_transfer: bankTransfer,
      }),
    },
  )
}

export async function installPlatformStorefrontTemplateStarter(
  storeProfileId: string,
  revision: number,
  templateKey: "glow-beauty",
): Promise<PlatformStorefrontStarterResult> {
  return await platformRequest<PlatformStorefrontStarterResult>(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/storefront/starter`,
    {
      method: "POST",
      body: JSON.stringify({ template_key: templateKey, revision }),
    },
  )
}

export async function publishPlatformStorefront(
  storeProfileId: string,
  draftRevision: number,
): Promise<PlatformStorefrontRecord> {
  return await platformRequest<PlatformStorefrontRecord>(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/storefront/publish`,
    {
      method: "POST",
      body: JSON.stringify({ draft_revision: draftRevision }),
    },
  )
}

export async function listPlatformMerchantMemberships(
  query: PlatformMerchantMembershipQuery = {},
): Promise<PlatformMerchantMembershipList> {
  const search = new URLSearchParams()
  const normalizedQuery = query.q?.trim().slice(0, 120)
  if (normalizedQuery) search.set("q", normalizedQuery)
  if (query.role) search.set("role", query.role)
  if (query.status) search.set("status", query.status)
  if (query.effective_access) search.set("effective_access", query.effective_access)
  if (query.account_status) search.set("account_status", query.account_status)
  if (typeof query.offset === "number") search.set("offset", String(query.offset))
  if (typeof query.limit === "number") search.set("limit", String(query.limit))
  const suffix = search.size ? `?${search.toString()}` : ""

  return await platformRequest<PlatformMerchantMembershipList>(
    `/admin/saas/merchant-memberships${suffix}`,
    { signal: query.signal },
  )
}

export async function getPlatformMerchantMembership(
  membershipId: string,
  signal?: AbortSignal,
): Promise<PlatformMerchantMembership> {
  const payload = await platformRequest<{
    membership: PlatformMerchantMembership
  }>(
    `/admin/saas/merchant-memberships/${encodeURIComponent(membershipId)}`,
    { signal },
  )
  return payload.membership
}

export async function createPlatformMerchantMembership(
  storeId: string,
  request: CreatePlatformMerchantMembershipRequest,
  idempotencyKey = `labibtech-membership-${crypto.randomUUID()}`,
): Promise<CreatePlatformMerchantMembershipResult> {
  return await platformRequest<CreatePlatformMerchantMembershipResult>(
    `/admin/saas/stores/${encodeURIComponent(storeId)}/merchant-memberships`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(request),
    },
  )
}

export async function updatePlatformMerchantMembership(
  membershipId: string,
  request: UpdatePlatformMerchantMembershipRequest,
): Promise<PlatformMerchantMembershipMutationResult> {
  return await platformRequest<PlatformMerchantMembershipMutationResult>(
    `/admin/saas/merchant-memberships/${encodeURIComponent(membershipId)}`,
    { method: "PATCH", body: JSON.stringify(request) },
  )
}

export async function revokePlatformMerchantSessions(
  membershipId: string,
): Promise<PlatformMerchantAccountMutationResult> {
  return await platformRequest<PlatformMerchantAccountMutationResult>(
    `/admin/saas/merchant-memberships/${encodeURIComponent(membershipId)}/revoke-sessions`,
    { method: "POST" },
  )
}

export async function resetPlatformMerchantPassword(
  membershipId: string,
  temporaryPassword: string,
): Promise<PlatformMerchantAccountMutationResult> {
  return await platformRequest<PlatformMerchantAccountMutationResult>(
    `/admin/saas/merchant-memberships/${encodeURIComponent(membershipId)}/reset-password`,
    {
      method: "POST",
      body: JSON.stringify({ temporary_password: temporaryPassword }),
    },
  )
}

export async function updatePlatformMerchantAccountStatus(
  membershipId: string,
  status: PlatformMerchantAccessStatus,
): Promise<PlatformMerchantAccountMutationResult> {
  return await platformRequest<PlatformMerchantAccountMutationResult>(
    `/admin/saas/merchant-memberships/${encodeURIComponent(membershipId)}/account-status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  )
}

export async function getPlatformStorefrontPreview(
  storeProfileId: string,
): Promise<PlatformStorefrontPreview> {
  const payload = await platformRequest<{ storefront: PlatformStorefrontPreview }>(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/storefront-preview`,
  )
  return payload.storefront
}

export async function provisionPlatformStore(
  request: ProvisionStoreRequest,
  idempotencyKey = `labibtech-owner-${crypto.randomUUID()}`,
): Promise<ProvisionStoreResult> {
  const payload = await platformRequest<{ provisioning: ProvisionStoreResult }>(
    "/admin/saas/provisioning",
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(request),
    },
  )

  return payload.provisioning
}

export async function setupPlatformStoreCommerce(
  storeProfileId: string,
  request: CommerceSetupRequest,
  idempotencyKey = `labibtech-commerce-${crypto.randomUUID()}`,
): Promise<CommerceSetupResult> {
  const payload = await platformRequest<{ commerce_setup: CommerceSetupResult }>(
    `/admin/saas/stores/${encodeURIComponent(storeProfileId)}/commerce-setup`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(request),
    },
  )

  return payload.commerce_setup
}

export async function retryPlatformCommerceSetup(
  setupId: string,
): Promise<CommerceSetupResult> {
  const payload = await platformRequest<{ commerce_setup: CommerceSetupResult }>(
    `/admin/saas/commerce-setup/${encodeURIComponent(setupId)}`,
    { method: "POST" },
  )

  return payload.commerce_setup
}

export function isUnauthorizedPlatformError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: number }).status === 401,
  )
}
