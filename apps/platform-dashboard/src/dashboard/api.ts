import type {
  PlatformVendor,
  ProvisionStoreRequest,
  ProvisionStoreResult,
  ProvisioningStatus,
} from "./types"

type ErrorPayload = {
  message?: string
}

async function platformRequest<T>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  })

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

export async function provisionPlatformStore(
  request: ProvisionStoreRequest,
): Promise<ProvisionStoreResult> {
  const payload = await platformRequest<{ provisioning: ProvisionStoreResult }>(
    "/admin/saas/provisioning",
    {
      method: "POST",
      headers: {
        "Idempotency-Key": `labibtech-owner-${crypto.randomUUID()}`,
      },
      body: JSON.stringify(request),
    },
  )

  return payload.provisioning
}

export function isUnauthorizedPlatformError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: number }).status === 401,
  )
}
