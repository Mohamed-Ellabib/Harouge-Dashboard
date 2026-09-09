import { createUserAccountWorkflow } from "@medusajs/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

import { MARKETPLACE_MODULE } from "../../src/modules/marketplace"
import { SAAS_MODULE } from "../../src/modules/saas"
import { executeSaasStoreProvisioning } from "../../src/workflows/provision-saas-store"
import {
  provisioningPassword,
  provisioningRequest,
} from "../helpers/provisioning-fixtures"

jest.setTimeout(180_000)

const fingerprintKeyId = "membership-http-test-v1"
const testEnv = {
  NODE_ENV: "test",
  JWT_SECRET: "test-only-jwt-secret-not-for-production",
  COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
  VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
  MEDUSA_FF_RBAC: "true",
  PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID: fingerprintKeyId,
  PROVISIONING_FINGERPRINT_KEYS: JSON.stringify({
    [fingerprintKeyId]:
      "test-only-membership-fingerprint-key-with-at-least-32-characters",
  }),
  SAAS_TEMPORARY_DOMAIN_BASE: "local.test",
  SAAS_SUPPORTED_CURRENCIES: "lyd,usd,eur",
  STORE_CORS: "http://127.0.0.1:8000",
  ADMIN_CORS: "http://127.0.0.1:9000",
  AUTH_CORS: "http://127.0.0.1:5174",
}

// The conditional RBAC module list is evaluated while Medusa loads its
// configuration, before the integration runner applies its child env.
Object.assign(process.env, testEnv)

let sequence = 0
const unique = (prefix: string) => {
  sequence += 1
  return `${prefix}-${sequence}`
}

const createPlatformUser = async (
  container: any,
  input: {
    email: string
    password: string
    roles?: string[]
  },
) => {
  const authService = container.resolve(Modules.AUTH) as any
  const registration = await authService.register("emailpass", {
    body: {
      email: input.email,
      password: input.password,
    },
  })

  if (!registration.success || !registration.authIdentity?.id) {
    throw new Error("The test platform identity could not be created.")
  }

  const { result } = await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId: registration.authIdentity.id,
      userData: {
        email: input.email,
        first_name: "Platform",
        last_name: "Tester",
        roles: input.roles ?? [],
      },
    },
  })

  return result
}

const authenticatePlatformUser = async (
  api: any,
  email: string,
  password: string,
) => {
  const response = await api.post("/auth/user/emailpass", {
    email,
    password,
  })

  expect(response.status).toBe(200)
  expect(typeof response.data.token).toBe("string")
  return response.data.token as string
}

const bearer = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
})

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: testEnv,
  testSuite: ({ api, getContainer }) => {
    describe("canonical platform merchant membership routes", () => {
      it("enforces Super Admin access and preserves create/replay/global owner invariants", async () => {
        const id = unique("merchant-membership-http")
        const container = getContainer()
        const superAdminEmail = `super-admin-${id}@example.test`
        const regularEmail = `regular-admin-${id}@example.test`
        const superAdminPassword = "Test-Only-Super-Admin-Password-001"
        const regularPassword = "Test-Only-Regular-Admin-Password-001"

        await createPlatformUser(container, {
          email: superAdminEmail,
          password: superAdminPassword,
          roles: ["role_super_admin"],
        })
        await createPlatformUser(container, {
          email: regularEmail,
          password: regularPassword,
        })

        const [superAdminToken, regularToken] = await Promise.all([
          authenticatePlatformUser(
            api,
            superAdminEmail,
            superAdminPassword,
          ),
          authenticatePlatformUser(api, regularEmail, regularPassword),
        ])

        await expect(
          api.get("/admin/saas/merchant-memberships"),
        ).rejects.toMatchObject({ response: { status: 401 } })
        await expect(
          api.get(
            "/admin/saas/merchant-memberships",
            bearer(regularToken),
          ),
        ).rejects.toMatchObject({ response: { status: 403 } })

        const allowed = await api.get(
          "/admin/saas/merchant-memberships",
          bearer(superAdminToken),
        )
        expect(allowed.status).toBe(200)

        const ownerEmail = `original-owner-${id}@example.test`
        const provisioned = await executeSaasStoreProvisioning(container, {
          idempotency_key: `provision:${id}`,
          actor_id: "platform-membership-http-test",
          request: provisioningRequest({
            suffix: id,
            ownerEmail,
          }),
        })
        const saas = container.resolve(SAAS_MODULE) as any
        const marketplace = container.resolve(MARKETPLACE_MODULE) as any
        const originalMemberships = await saas.listMerchantMemberships({
          store_profile_id: provisioned.store_profile_id,
        })
        expect(originalMemberships).toHaveLength(1)
        const originalMembership = originalMemberships[0]

        const secondOwnerPassword = "Test-Only-Second-Owner-Password-001"
        const createBody = {
          email: `second-owner-${id}@example.test`,
          display_name: "Second Effective Owner",
          role: "owner",
          reuse_existing_account: false,
          initial_password: secondOwnerPassword,
        }
        const createConfig = {
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            "Idempotency-Key": `membership:${id}:second-owner`,
          },
        }
        const createUrl =
          `/admin/saas/stores/${provisioned.store_profile_id}` +
          "/merchant-memberships"
        const created = await api.post(createUrl, createBody, createConfig)
        const replayed = await api.post(createUrl, createBody, createConfig)

        expect(created.status).toBe(201)
        expect(created.data).toMatchObject({
          created: true,
          replayed: false,
          membership: {
            email: createBody.email,
            role: "owner",
            status: "active",
            account_status: "active",
            effective_access: "active",
            store: { id: provisioned.store_profile_id },
          },
        })
        expect(replayed.status).toBe(200)
        expect(replayed.data).toMatchObject({
          created: false,
          replayed: true,
          membership: { id: created.data.membership.id },
        })
        const retrieved = await api.get(
          `/admin/saas/merchant-memberships/${created.data.membership.id}`,
          bearer(superAdminToken),
        )
        expect(retrieved.data).toEqual({
          membership: created.data.membership,
        })

        const matchingAccounts = (
          await marketplace.listVendorMembers({})
        ).filter(
          (account: any) => account.email === createBody.email,
        )
        const matchingMemberships = await saas.listMerchantMemberships({
          store_profile_id: provisioned.store_profile_id,
          merchant_account_reference: matchingAccounts[0]?.id,
        })
        expect(matchingAccounts).toHaveLength(1)
        expect(matchingMemberships).toHaveLength(1)

        const accountStatusUrl = (membershipId: string) =>
          `/admin/saas/merchant-memberships/${membershipId}/account-status`
        const disabledOriginal = await api.patch(
          accountStatusUrl(originalMembership.id),
          { status: "disabled" },
          bearer(superAdminToken),
        )
        expect(disabledOriginal.data).toMatchObject({
          account: { email: ownerEmail, status: "disabled" },
          scope: "global",
          affected_store_count: 1,
        })

        await expect(
          api.patch(
            accountStatusUrl(created.data.membership.id),
            { status: "disabled" },
            bearer(superAdminToken),
          ),
        ).rejects.toMatchObject({ response: { status: 409 } })

        const reactivatedOriginal = await api.patch(
          accountStatusUrl(originalMembership.id),
          { status: "active" },
          bearer(superAdminToken),
        )
        expect(reactivatedOriginal.data).toMatchObject({
          account: { email: ownerEmail, status: "active" },
          scope: "global",
        })

        const responseBoundary = JSON.stringify({
          allowed: allowed.data,
          created: created.data,
          replayed: replayed.data,
          retrieved: retrieved.data,
          disabledOriginal: disabledOriginal.data,
          reactivatedOriginal: reactivatedOriginal.data,
        })
        expect(responseBoundary).not.toContain(provisioningPassword)
        expect(responseBoundary).not.toContain(secondOwnerPassword)
        expect(responseBoundary).not.toMatch(
          /password_hash|session_version|user_id|vendor_id|merchant_account_reference|metadata/i,
        )
      })
    })
  },
})
