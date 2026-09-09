import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createHash } from "crypto"

import { MARKETPLACE_MODULE } from "../../../modules/marketplace"
import { SAAS_MODULE } from "../../../modules/saas"
import {
  createPlatformMerchantMembership,
  listPlatformMerchantMemberships,
  parsePlatformMembershipIdempotencyKey,
  resetPlatformMerchantAccountPassword,
  revokePlatformMerchantAccountSessions,
  updatePlatformMerchantAccountStatus,
  updatePlatformMerchantMembership,
} from "../platform-merchant-memberships"
import { provisioningValueFingerprint } from "../../../workflows/provisioning-contract"

type RecordLike = Record<string, any>

const VALID_TEST_PASSWORD_HASH =
  "scrypt$bWVkdXNhLWR1bW15LWxvZ2luLXNhbHQ$MCb60ByrqzY8O4BA3Z4DvUCKYCOTMh4V7m_yV5835QVV05NlHJwtwbIwgKyV04zKIXcrCwF3Hkx3JWQGjy99Hw"

const filteredPage = (
  rows: RecordLike[],
  filters: RecordLike = {},
  config: RecordLike = {},
) => {
  const filtered = rows.filter((row) =>
    Object.entries(filters).every(([key, value]) => row[key] === value),
  )
  const skip = Number(config.skip ?? 0)
  const take = Number(config.take ?? filtered.length)
  return filtered.slice(skip, skip + take)
}

const fixture = (vendorStatus = "active") => {
  const memberships = [
    {
      id: "mship_owner",
      store_profile_id: "stprof_store",
      merchant_account_reference: "vmem_owner",
      role: "owner",
      status: "active",
      created_at: "2026-08-10T10:00:00.000Z",
    },
  ]
  const accounts = [
    {
      id: "vmem_owner",
      vendor_id: "vend_store",
      user_id: "user_internal",
      email: "owner@example.test",
      role: "owner",
      status: "active",
      metadata: {
        display_name: "Store Owner",
        password_hash: VALID_TEST_PASSWORD_HASH,
        session_version: 11,
      },
    },
  ]
  const profiles = [
    {
      id: "stprof_store",
      tenant_id: "tenant_store",
      legacy_vendor_id: "vend_store",
      handle: "store",
      status: "active",
      plan_code: "professional_commerce",
    },
  ]
  const vendors = [
    {
      id: "vend_store",
      name: "Safe Store",
      status: vendorStatus,
    },
  ]
  const tenants = [{ id: "tenant_store", status: "active" }]
  const saas = {
    listMerchantMemberships: jest.fn((filters, config) =>
      Promise.resolve(filteredPage(memberships, filters, config)),
    ),
    listStoreProfiles: jest.fn((filters, config) =>
      Promise.resolve(filteredPage(profiles, filters, config)),
    ),
    listTenants: jest.fn((filters, config) =>
      Promise.resolve(filteredPage(tenants, filters, config)),
    ),
    updateMerchantMemberships: jest.fn(),
  }
  const marketplace = {
    listVendorMembers: jest.fn((filters, config) =>
      Promise.resolve(filteredPage(accounts, filters, config)),
    ),
    listVendors: jest.fn((filters, config) =>
      Promise.resolve(filteredPage(vendors, filters, config)),
    ),
  }
  const transaction = {
    raw: jest.fn().mockResolvedValue(undefined),
  }
  const database = {
    transaction: jest.fn(async (work) => await work(transaction)),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === SAAS_MODULE) return saas
      if (key === MARKETPLACE_MODULE) return marketplace
      if (key === ContainerRegistrationKeys.PG_CONNECTION) return database
      if (key === Modules.STORE) return { retrieveStore: jest.fn() }
      throw new Error(`Unexpected service: ${key}`)
    }),
  } as any

  return { container, saas, marketplace }
}

const statefulFixture = (input?: {
  accounts?: RecordLike[]
  memberships?: RecordLike[]
}) => {
  const state = {
    accounts: [...(input?.accounts ?? [])],
    memberships: [...(input?.memberships ?? [])],
    profiles: [
      {
        id: "stprof_alpha",
        tenant_id: "tenant_platform",
        legacy_vendor_id: "vend_alpha",
        handle: "alpha",
        status: "active",
        plan_code: "starter_whatsapp",
      },
      {
        id: "stprof_beta",
        tenant_id: "tenant_platform",
        legacy_vendor_id: "vend_beta",
        handle: "beta",
        status: "active",
        plan_code: "professional_commerce",
      },
    ],
    tenants: [{ id: "tenant_platform", status: "active" }],
    vendors: [
      { id: "vend_alpha", name: "Alpha Store", status: "active" },
      { id: "vend_beta", name: "Beta Store", status: "active" },
    ],
    links: [
      { store_profile_id: "stprof_alpha", store_id: "store_alpha" },
      { store_profile_id: "stprof_beta", store_id: "store_beta" },
    ],
  }
  let accountSequence = state.accounts.length
  let membershipSequence = state.memberships.length
  const page = (rows: RecordLike[], filters = {}, config = {}) =>
    Promise.resolve(filteredPage(rows, filters, config))
  const saas = {
    listMerchantMemberships: jest.fn((filters, config) =>
      page(state.memberships, filters, config),
    ),
    listStoreProfiles: jest.fn((filters, config) =>
      page(state.profiles, filters, config),
    ),
    listTenants: jest.fn((filters, config) =>
      page(state.tenants, filters, config),
    ),
    createMerchantMemberships: jest.fn(async (data: RecordLike) => {
      const membership = {
        id: `mship_created_${++membershipSequence}`,
        created_at: "2026-08-11T12:00:00.000Z",
        ...data,
      }
      state.memberships.push(membership)
      return membership
    }),
    updateMerchantMemberships: jest.fn(async (data: RecordLike) => {
      const membership = state.memberships.find(
        (candidate) => candidate.id === data.id,
      )
      if (!membership) throw new Error("missing membership")
      Object.assign(membership, data)
      return membership
    }),
  }
  const marketplace = {
    listVendorMembers: jest.fn((filters, config) =>
      page(state.accounts, filters, config),
    ),
    listVendors: jest.fn((filters, config) =>
      page(state.vendors, filters, config),
    ),
    createVendorMembers: jest.fn(async (data: RecordLike) => {
      const account = {
        id: `vmem_created_${++accountSequence}`,
        created_at: "2026-08-11T12:00:00.000Z",
        ...data,
      }
      state.accounts.push(account)
      return account
    }),
    updateVendorMembers: jest.fn(async (data: RecordLike) => {
      const account = state.accounts.find(
        (candidate) => candidate.id === data.id,
      )
      if (!account) throw new Error("missing account")
      Object.assign(account, data)
      return account
    }),
    deleteVendorMembers: jest.fn(async (ids: string | string[]) => {
      const idSet = new Set(Array.isArray(ids) ? ids : [ids])
      state.accounts = state.accounts.filter(
        (candidate) => !idSet.has(candidate.id),
      )
    }),
  }
  const transaction = { raw: jest.fn().mockResolvedValue(undefined) }
  const database = {
    transaction: jest.fn(async (work) => await work(transaction)),
  }
  const linkModule = {
    list: jest.fn((filters = {}) => page(state.links, filters)),
  }
  const storeService = {
    retrieveStore: jest.fn(async (id: string) => ({ id })),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === SAAS_MODULE) return saas
      if (key === MARKETPLACE_MODULE) return marketplace
      if (key === ContainerRegistrationKeys.PG_CONNECTION) return database
      if (key === ContainerRegistrationKeys.LINK) {
        return { getLinkModule: jest.fn(() => linkModule) }
      }
      if (key === Modules.STORE) return storeService
      throw new Error(`Unexpected service: ${key}`)
    }),
  } as any

  return {
    container,
    marketplace,
    saas,
    state,
    transaction,
  }
}

const activeAccount = (
  id: string,
  email: string,
  vendorId: string,
  displayName: string,
) => ({
  id,
  vendor_id: vendorId,
  user_id: null,
  email,
  role: "owner",
  status: "active",
  metadata: {
    display_name: displayName,
    password_hash: VALID_TEST_PASSWORD_HASH,
    password_change_required: true,
    session_version: 0,
  },
})

const membership = (
  id: string,
  storeProfileId: string,
  accountId: string,
  role = "owner",
) => ({
  id,
  store_profile_id: storeProfileId,
  merchant_account_reference: accountId,
  role,
  status: "active",
  created_at: "2026-08-10T10:00:00.000Z",
})

const expectMedusaError = async (
  promise: Promise<unknown>,
  type: string,
) => {
  try {
    await promise
    throw new Error("Expected the operation to fail.")
  } catch (error) {
    expect(error).toBeInstanceOf(MedusaError)
    expect((error as MedusaError).type).toBe(type)
  }
}

const previousFingerprintKeyId =
  process.env.PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID
const previousFingerprintKeys = process.env.PROVISIONING_FINGERPRINT_KEYS

beforeAll(() => {
  process.env.PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID = "membership-test-v1"
  process.env.PROVISIONING_FINGERPRINT_KEYS = JSON.stringify({
    "membership-test-v1":
      "membership-test-fingerprint-secret-at-least-thirty-two-characters",
  })
})

afterAll(() => {
  if (previousFingerprintKeyId === undefined) {
    delete process.env.PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID
  } else {
    process.env.PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID =
      previousFingerprintKeyId
  }

  if (previousFingerprintKeys === undefined) {
    delete process.env.PROVISIONING_FINGERPRINT_KEYS
  } else {
    process.env.PROVISIONING_FINGERPRINT_KEYS = previousFingerprintKeys
  }
})

describe("platform merchant membership administration", () => {
  it("returns one safe Store-scoped row and never serializes credential fields", async () => {
    const { container } = fixture()
    const result = await listPlatformMerchantMemberships(container, {
      q: "safe store",
      role: "owner",
      status: "active",
      account_status: "active",
      effective_access: "active",
      offset: "0",
      limit: "10",
    })

    expect(result).toEqual({
      memberships: [
        {
          id: "mship_owner",
          email: "owner@example.test",
          display_name: "Store Owner",
          role: "owner",
          status: "active",
          account_status: "active",
          effective_access: "active",
          joined_at: "2026-08-10T10:00:00.000Z",
          store: {
            id: "stprof_store",
            name: "Safe Store",
            handle: "store",
            status: "active",
            plan_code: "professional_commerce",
          },
          account_store_count: 1,
        },
      ],
      count: 1,
      offset: 0,
      limit: 10,
      summary: {
        total_memberships: 1,
        distinct_accounts: 1,
        active_access: 1,
        disabled_access: 0,
        owner_memberships: 1,
        manager_memberships: 0,
      },
    })
    expect(JSON.stringify(result.memberships)).not.toMatch(
      /metadata|password|session_version|user_id|vendor_id|merchant_account_reference/i,
    )
  })

  it("fails effective access closed when the mapped compatibility Store is inactive", async () => {
    const { container } = fixture("suspended")
    const result = await listPlatformMerchantMemberships(container, {})

    expect(result.memberships[0].effective_access).toBe("disabled")
    expect(result.summary).toMatchObject({
      active_access: 0,
      disabled_access: 1,
    })
  })

  it("represents a missing account as unavailable and filters effective access", async () => {
    const { container } = statefulFixture({
      memberships: [
        membership(
          "mship_orphan",
          "stprof_alpha",
          "vmem_unavailable",
        ),
      ],
    })
    const result = await listPlatformMerchantMemberships(container, {
      account_status: "unavailable",
      effective_access: "disabled",
    })

    expect(result.count).toBe(1)
    expect(result.memberships[0]).toMatchObject({
      id: "mship_orphan",
      email: null,
      display_name: null,
      account_status: "unavailable",
      effective_access: "disabled",
    })
  })

  it("strictly rejects unsupported query and body fields", async () => {
    const { container } = fixture()

    await expectMedusaError(
      listPlatformMerchantMemberships(container, { secret: "value" }),
      MedusaError.Types.INVALID_DATA,
    )
    await expectMedusaError(
      listPlatformMerchantMemberships(container, {
        effective_access: "maybe",
      }),
      MedusaError.Types.INVALID_DATA,
    )
    await expectMedusaError(
      createPlatformMerchantMembership(
        container,
        "stprof_store",
        {
          email: "owner@example.test",
          display_name: "Store Owner",
          role: "owner",
          reuse_existing_account: true,
          unsupported: true,
        },
        "membership:test:strict-body",
      ),
      MedusaError.Types.INVALID_DATA,
    )
  })

  it("requires one bounded, non-whitespace idempotency key", () => {
    expect(
      parsePlatformMembershipIdempotencyKey("membership:test:0001"),
    ).toBe("membership:test:0001")
    expect(() => parsePlatformMembershipIdempotencyKey("bad key")).toThrow(
      MedusaError,
    )
    expect(() =>
      parsePlatformMembershipIdempotencyKey(["one", "two"]),
    ).toThrow(MedusaError)
  })

  it("does not disable or downgrade the last effective active owner", async () => {
    const { container, saas } = fixture()

    await expectMedusaError(
      updatePlatformMerchantMembership(container, "mship_owner", {
        status: "disabled",
      }),
      MedusaError.Types.CONFLICT,
    )
    expect(saas.updateMerchantMemberships).not.toHaveBeenCalled()
  })

  it("does not count malformed merchant credentials as replacement owners", async () => {
    const validOwner = activeAccount(
      "vmem_valid_owner",
      "valid-owner@example.test",
      "vend_alpha",
      "Valid Owner",
    )
    const nonNormalizedOwner = activeAccount(
      "vmem_non_normalized_owner",
      "Other-Owner@Example.test",
      "vend_alpha",
      "Non-normalized Owner",
    )
    const invalidPasswordOwner = activeAccount(
      "vmem_invalid_password_owner",
      "invalid-password@example.test",
      "vend_alpha",
      "Invalid Password Owner",
    )
    invalidPasswordOwner.metadata.password_hash = "not-a-usable-credential"
    const { container, state } = statefulFixture({
      accounts: [validOwner, nonNormalizedOwner, invalidPasswordOwner],
      memberships: [
        membership(
          "mship_valid_owner",
          "stprof_alpha",
          validOwner.id,
        ),
        membership(
          "mship_non_normalized_owner",
          "stprof_alpha",
          nonNormalizedOwner.id,
        ),
        membership(
          "mship_invalid_password_owner",
          "stprof_alpha",
          invalidPasswordOwner.id,
        ),
      ],
    })

    const listed = await listPlatformMerchantMemberships(container, {})
    expect(
      listed.memberships.find(
        (candidate) => candidate.id === "mship_non_normalized_owner",
      )?.effective_access,
    ).toBe("disabled")
    expect(
      listed.memberships.find(
        (candidate) => candidate.id === "mship_invalid_password_owner",
      )?.effective_access,
    ).toBe("disabled")

    await expectMedusaError(
      updatePlatformMerchantMembership(
        container,
        "mship_valid_owner",
        { status: "disabled" },
      ),
      MedusaError.Types.CONFLICT,
    )
    await expectMedusaError(
      updatePlatformMerchantAccountStatus(
        container,
        "mship_valid_owner",
        { status: "disabled" },
      ),
      MedusaError.Types.CONFLICT,
    )
    expect(validOwner.status).toBe("active")
    expect(
      state.memberships.find(
        (candidate) => candidate.id === "mship_valid_owner",
      )?.status,
    ).toBe("active")
  })

  it("creates a new merchant account and explicitly reuses it for another Store", async () => {
    const { container, state } = statefulFixture()
    const created = await createPlatformMerchantMembership(
      container,
      "stprof_alpha",
      {
        email: "owner@example.test",
        display_name: "Owner Example",
        role: "owner",
        reuse_existing_account: false,
        initial_password: "TemporaryPass-001",
      },
      "membership:create:owner:alpha",
    )
    const reused = await createPlatformMerchantMembership(
      container,
      "stprof_beta",
      {
        email: "owner@example.test",
        display_name: "Owner Example",
        role: "manager",
        reuse_existing_account: true,
      },
      "membership:reuse:owner:beta",
    )

    expect(created).toMatchObject({
      created: true,
      replayed: false,
      membership: {
        email: "owner@example.test",
        role: "owner",
        account_store_count: 1,
      },
    })
    expect(reused).toMatchObject({
      created: true,
      replayed: false,
      membership: {
        email: "owner@example.test",
        role: "manager",
        account_store_count: 2,
      },
    })
    expect(state.accounts).toHaveLength(1)
    expect(state.memberships).toHaveLength(2)
    expect(JSON.stringify({ created, reused })).not.toMatch(
      /password_hash|session_version|user_id|vendor_id|merchant_account_reference|TemporaryPass/i,
    )
  })

  it("replays the same idempotent create and conflicts on changed password or role", async () => {
    const { container, state } = statefulFixture()
    const body = {
      email: "idempotent@example.test",
      display_name: "Idempotent Owner",
      role: "owner" as const,
      reuse_existing_account: false,
      initial_password: "TemporaryPass-002",
    }
    const key = "membership:idempotent:owner:alpha"
    const first = await createPlatformMerchantMembership(
      container,
      "stprof_alpha",
      body,
      key,
    )
    const storedPasswordHash = state.accounts[0].metadata.password_hash
    const replay = await createPlatformMerchantMembership(
      container,
      "stprof_alpha",
      body,
      key,
    )

    expect(first.created).toBe(true)
    expect(replay).toMatchObject({ created: false, replayed: true })
    expect(state.accounts).toHaveLength(1)
    expect(state.memberships).toHaveLength(1)

    await expectMedusaError(
      createPlatformMerchantMembership(
        container,
        "stprof_alpha",
        { ...body, initial_password: "DifferentPass-003" },
        key,
      ),
      MedusaError.Types.CONFLICT,
    )
    await expectMedusaError(
      createPlatformMerchantMembership(
        container,
        "stprof_alpha",
        { ...body, role: "manager" },
        key,
      ),
      MedusaError.Types.CONFLICT,
    )
    expect(state.accounts[0].metadata.password_hash).toBe(storedPasswordHash)
  })

  it("recovers a pending account with zero memberships without changing its password", async () => {
    const key = "membership:recover:pending:alpha"
    const password = "TemporaryPass-004"
    const keyHash = createHash("sha256").update(key, "utf8").digest("hex")
    const requestHash = provisioningValueFingerprint({
      version: 1,
      store_profile_id: "stprof_alpha",
      email: "pending@example.test",
      display_name: "Pending Owner",
      role: "owner",
      reuse_existing_account: false,
      initial_password: password,
    })
    const pendingAccount = activeAccount(
      "vmem_pending",
      "pending@example.test",
      "vend_alpha",
      "Pending Owner",
    )
    pendingAccount.metadata.password_hash = VALID_TEST_PASSWORD_HASH
    Object.assign(pendingAccount.metadata, {
      platform_membership_pending_idempotency: {
        key_hash: keyHash,
        request_hash: requestHash,
        store_profile_id: "stprof_alpha",
      },
    })
    const { container, state } = statefulFixture({
      accounts: [pendingAccount],
    })
    const recovered = await createPlatformMerchantMembership(
      container,
      "stprof_alpha",
      {
        email: "pending@example.test",
        display_name: "Pending Owner",
        role: "owner",
        reuse_existing_account: false,
        initial_password: password,
      },
      key,
    )

    expect(recovered).toMatchObject({
      created: true,
      replayed: false,
      recovered: true,
      membership: { email: "pending@example.test", role: "owner" },
    })
    expect(state.memberships).toHaveLength(1)
    expect(state.accounts[0].metadata.password_hash).toBe(
      VALID_TEST_PASSWORD_HASH,
    )
    expect(
      state.accounts[0].metadata.platform_membership_pending_idempotency,
    ).toBeUndefined()
    expect(
      state.accounts[0].metadata.platform_membership_idempotency[keyHash],
    ).toMatchObject({
      request_hash: requestHash,
      store_profile_id: "stprof_alpha",
    })
    expect(JSON.stringify(recovered)).not.toMatch(
      /password|session_version|merchant_account_reference|scrypt/i,
    )
  })

  it("blocks global disable until every Store retains another active owner, then reactivates globally", async () => {
    const ownerA = activeAccount(
      "vmem_owner_a",
      "owner-a@example.test",
      "vend_alpha",
      "Owner A",
    )
    const ownerB = activeAccount(
      "vmem_owner_b",
      "owner-b@example.test",
      "vend_alpha",
      "Owner B",
    )
    const { container, state } = statefulFixture({
      accounts: [ownerA, ownerB],
      memberships: [
        membership(
          "mship_a_alpha",
          "stprof_alpha",
          "vmem_owner_a",
        ),
        membership(
          "mship_a_beta",
          "stprof_beta",
          "vmem_owner_a",
        ),
        membership(
          "mship_b_alpha",
          "stprof_alpha",
          "vmem_owner_b",
        ),
      ],
    })

    await expectMedusaError(
      updatePlatformMerchantAccountStatus(
        container,
        "mship_a_alpha",
        { status: "disabled" },
      ),
      MedusaError.Types.CONFLICT,
    )
    expect(ownerA.status).toBe("active")

    state.memberships.push(
      membership(
        "mship_b_beta",
        "stprof_beta",
        "vmem_owner_b",
      ),
    )
    const disabled = await updatePlatformMerchantAccountStatus(
      container,
      "mship_a_alpha",
      { status: "disabled" },
    )
    const reactivated = await updatePlatformMerchantAccountStatus(
      container,
      "mship_a_alpha",
      { status: "active" },
    )

    expect(disabled).toMatchObject({
      account: { status: "disabled" },
      scope: "global",
      affected_store_count: 2,
    })
    expect(reactivated).toMatchObject({
      account: { status: "active" },
      scope: "global",
      affected_store_count: 2,
    })
    expect(ownerA.metadata.session_version).toBe(2)
  })

  it("resets credentials and revokes sessions globally across a multi-Store account", async () => {
    const account = activeAccount(
      "vmem_multi",
      "multi@example.test",
      "vend_alpha",
      "Multi Store",
    )
    const originalHash = account.metadata.password_hash
    const { container } = statefulFixture({
      accounts: [account],
      memberships: [
        membership("mship_multi_a", "stprof_alpha", "vmem_multi"),
        membership("mship_multi_b", "stprof_beta", "vmem_multi", "manager"),
      ],
    })
    const reset = await resetPlatformMerchantAccountPassword(
      container,
      "mship_multi_a",
      { temporary_password: "TemporaryPass-005" },
    )
    const resetHash = account.metadata.password_hash
    const revoked = await revokePlatformMerchantAccountSessions(
      container,
      "mship_multi_a",
      {},
    )

    expect(reset).toMatchObject({
      account: {
        email: "multi@example.test",
        display_name: "Multi Store",
        status: "active",
      },
      scope: "global",
      affected_store_count: 2,
    })
    expect(resetHash).not.toBe(originalHash)
    expect(account.metadata.password_change_required).toBe(true)
    expect(account.metadata.session_version).toBe(2)
    expect(revoked).toMatchObject({
      scope: "global",
      affected_store_count: 2,
    })
    expect(JSON.stringify({ reset, revoked })).not.toMatch(
      /password|hash|session|user_id|vendor_id|merchant_account_reference/i,
    )
  })
})
