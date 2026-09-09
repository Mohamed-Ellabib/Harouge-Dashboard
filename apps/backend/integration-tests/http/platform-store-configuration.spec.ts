import { randomUUID } from "node:crypto"

import { createUserAccountWorkflow } from "@medusajs/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

import {
  readPlatformStoreConfiguration,
  updatePlatformStoreConfiguration,
} from "../../src/api/_utils/platform-store-configuration"
import { MARKETPLACE_MODULE } from "../../src/modules/marketplace"
import { SAAS_MODULE } from "../../src/modules/saas"
import { executeSaasStoreProvisioning } from "../../src/workflows/provision-saas-store"
import {
  provisioningPassword,
  provisioningRequest,
} from "../helpers/provisioning-fixtures"

jest.setTimeout(180_000)

const fingerprintKeyId = "store-configuration-test-v1"
const testEnv = {
  NODE_ENV: "test",
  JWT_SECRET: "test-only-jwt-secret-not-for-production",
  COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
  VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
  MEDUSA_FF_RBAC: "true",
  PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID: fingerprintKeyId,
  PROVISIONING_FINGERPRINT_KEYS: JSON.stringify({
    [fingerprintKeyId]:
      "test-only-store-configuration-key-with-at-least-32-characters",
  }),
  SAAS_TEMPORARY_DOMAIN_BASE: "local.test",
  SAAS_SUPPORTED_CURRENCIES: "lyd",
  STORE_CORS: "http://127.0.0.1:5176",
  ADMIN_CORS: "http://127.0.0.1:9000",
  AUTH_CORS: "http://127.0.0.1:5175",
}

Object.assign(process.env, testEnv)

const nextSuffix = () => randomUUID().replace(/-/g, "").slice(0, 12)

const createPlatformUser = async (
  container: any,
  email: string,
  password: string,
  roles: string[] = [],
) => {
  const auth = container.resolve(Modules.AUTH) as any
  const registration = await auth.register("emailpass", {
    body: { email, password },
  })
  if (!registration.success || !registration.authIdentity?.id) {
    throw new Error("The test platform identity could not be created.")
  }
  const { result } = await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId: registration.authIdentity.id,
      userData: { email, first_name: "Store", last_name: "Tester", roles },
    },
  })
  return result
}

const authenticate = async (api: any, email: string, password: string) => {
  const response = await api.post("/auth/user/emailpass", { email, password })
  return response.data.token as string
}

const bearer = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
})

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: testEnv,
  testSuite: ({ api, getContainer }) => {
    describe("platform Store configuration", () => {
      it("requires a real Super Admin session on the HTTP contract", async () => {
        const container = getContainer()
        const suffix = nextSuffix()
        const request = provisioningRequest({ suffix })
        const provisioned = await executeSaasStoreProvisioning(container, {
          idempotency_key: `store-config-auth:${suffix}`,
          actor_id: "user_super_admin_test",
          request,
        })
        const regularEmail = `regular-${suffix}@example.test`
        const superEmail = `super-${suffix}@example.test`
        const regularPassword = "Test-Only-Regular-Password-001"
        const superPassword = "Test-Only-Super-Password-001"
        await createPlatformUser(container, regularEmail, regularPassword)
        const superUser = await createPlatformUser(
          container,
          superEmail,
          superPassword,
          ["role_super_admin"],
        )
        const [regularToken, superToken] = await Promise.all([
          authenticate(api, regularEmail, regularPassword),
          authenticate(api, superEmail, superPassword),
        ])
        const url =
          `/admin/saas/stores/${provisioned.store_profile_id}/configuration`
        await expect(api.get(url)).rejects.toMatchObject({
          response: { status: 401 },
        })
        await expect(api.get(url, bearer(regularToken))).rejects.toMatchObject({
          response: { status: 403 },
        })
        const allowed = await api.get(url, bearer(superToken))
        expect(allowed.status).toBe(200)
        expect(allowed.headers["cache-control"]).toContain("no-store")
        await expect(
          api.put(
            url,
            {
              configuration: {
                ...allowed.data.configuration,
                locale: "ar-LY",
                brand: {
                  ...allowed.data.configuration.brand,
                  typography_key: "cairo",
                },
              },
              revision: allowed.data.revision,
            },
            bearer(regularToken),
          ),
        ).rejects.toMatchObject({ response: { status: 403 } })
        const saved = await api.put(
          url,
          {
            configuration: {
              ...allowed.data.configuration,
              name: "HTTP Configured Store",
              locale: "ar-LY",
              brand: {
                ...allowed.data.configuration.brand,
                typography_key: "cairo",
              },
            },
            revision: allowed.data.revision,
          },
          bearer(superToken),
        )
        expect(saved.data.updated_by).toBe(superUser.id)
      })

      it("updates every canonical mirror atomically and rejects stale edits", async () => {
        const container = getContainer()
        const suffix = nextSuffix()
        const request = provisioningRequest({ suffix })
        const provisioned = await executeSaasStoreProvisioning(container, {
          idempotency_key: `store-config:${suffix}`,
          actor_id: "user_super_admin_test",
          request,
        })
        const original = await readPlatformStoreConfiguration(
          container,
          provisioned.store_profile_id,
        )
        expect(original.revision).toBe(1)
        expect(original.configuration.name).toBe(request.store.name)

        const configuration = {
          name: "Configured Store",
          locale: "en-LY" as const,
          contact: {
            public_email: "public-config@example.test",
            public_phone: "+218 91 222 3344",
            whatsapp_number: "+218 92 555 6677",
          },
          brand: {
            logo_url: "https://assets.example.test/configured-logo.png",
            primary_color: "#123456",
            secondary_color: "#abcdef",
            typography_key: "cairo" as const,
          },
        }

        const saved = await updatePlatformStoreConfiguration(
          container,
          provisioned.store_profile_id,
          { configuration, revision: original.revision },
          "user_super_admin_test",
        )
        expect(saved).toMatchObject({
          configuration,
          revision: 2,
          updated_by: "user_super_admin_test",
        })
        await expect(
          readPlatformStoreConfiguration(
            container,
            provisioned.store_profile_id,
          ),
        ).resolves.toEqual(saved)

        const database = container.resolve(
          ContainerRegistrationKeys.PG_CONNECTION,
        ) as any
        const profile = await database("store_profile")
          .where({ id: provisioned.store_profile_id })
          .first()
        const links = await database("store_profile_store")
          .where({ store_profile_id: provisioned.store_profile_id })
          .whereNull("deleted_at")
        const [store, brand, vendor] = await Promise.all([
          database("store").where({ id: links[0].store_id }).first(),
          database("store_brand")
            .where({ store_profile_id: provisioned.store_profile_id })
            .whereNull("deleted_at")
            .first(),
          database("vendor").where({ id: profile.legacy_vendor_id }).first(),
        ])
        expect(store.name).toBe(configuration.name)
        expect(profile).toMatchObject({
          locale: "en-LY",
          public_contact_email: configuration.contact.public_email,
          public_phone: configuration.contact.public_phone,
          whatsapp_number: configuration.contact.whatsapp_number,
          configuration_revision: 2,
          configuration_updated_by: "user_super_admin_test",
        })
        expect(brand).toMatchObject({
          logo_url: configuration.brand.logo_url,
          primary_color: configuration.brand.primary_color,
          secondary_color: configuration.brand.secondary_color,
          typography_key: "cairo",
        })
        expect(vendor).toMatchObject({
          name: configuration.name,
          contact_email: configuration.contact.public_email,
          logo_url: configuration.brand.logo_url,
          primary_color: configuration.brand.primary_color,
        })

        await expect(
          updatePlatformStoreConfiguration(
            container,
            provisioned.store_profile_id,
            { configuration: { ...configuration, name: "Stale Store" }, revision: 1 },
            "user_stale_test",
          ),
        ).rejects.toMatchObject({ type: MedusaError.Types.CONFLICT })
        expect(
          (
            await readPlatformStoreConfiguration(
              container,
              provisioned.store_profile_id,
            )
          ).configuration.name,
        ).toBe(configuration.name)

        void provisioningPassword
      })

      it("allows exactly one concurrent write for the same revision", async () => {
        const container = getContainer()
        const suffix = nextSuffix()
        const request = provisioningRequest({ suffix })
        const provisioned = await executeSaasStoreProvisioning(container, {
          idempotency_key: `store-config-concurrent:${suffix}`,
          actor_id: "user_super_admin_test",
          request,
        })
        const current = await readPlatformStoreConfiguration(
          container,
          provisioned.store_profile_id,
        )
        const base = {
          ...current.configuration,
          locale: "ar-LY" as const,
          brand: {
            ...current.configuration.brand,
            typography_key: "cairo" as const,
          },
        }
        const results = await Promise.allSettled([
          updatePlatformStoreConfiguration(
            container,
            provisioned.store_profile_id,
            { configuration: { ...base, name: "Concurrent One" }, revision: current.revision },
            "user_one",
          ),
          updatePlatformStoreConfiguration(
            container,
            provisioned.store_profile_id,
            { configuration: { ...base, name: "Concurrent Two" }, revision: current.revision },
            "user_two",
          ),
        ])
        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
        expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
        expect(
          (results.find((result) => result.status === "rejected") as PromiseRejectedResult)
            .reason,
        ).toMatchObject({ type: MedusaError.Types.CONFLICT })
      })

      it("strictly rejects unsupported or unsafe values without mutation", async () => {
        const container = getContainer()
        const suffix = nextSuffix()
        const request = provisioningRequest({ suffix })
        const provisioned = await executeSaasStoreProvisioning(container, {
          idempotency_key: `store-config-invalid:${suffix}`,
          actor_id: "user_super_admin_test",
          request,
        })
        const current = await readPlatformStoreConfiguration(
          container,
          provisioned.store_profile_id,
        )
        const invalidConfiguration = {
          ...current.configuration,
          locale: "en-US",
          brand: {
            ...current.configuration.brand,
            logo_url: "http://169.254.169.254/metadata",
            primary_color: "red",
            typography_key: "remote-font",
          },
          handle: "must-not-change",
        }
        await expect(
          updatePlatformStoreConfiguration(
            container,
            provisioned.store_profile_id,
            { configuration: invalidConfiguration, revision: current.revision },
            "user_super_admin_test",
          ),
        ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
        await expect(
          readPlatformStoreConfiguration(
            container,
            provisioned.store_profile_id,
          ),
        ).resolves.toEqual(current)

        for (const unsafeLogo of [
          "https://[::1]/logo.png",
          "https://[fc00::1]/logo.png",
          "https://[fe80::1]/logo.png",
          "https://[::ffff:127.0.0.1]/logo.png",
          "https://[::ffff:169.254.169.254]/logo.png",
          "https://[::ffff:10.0.0.1]/logo.png",
          "https://example.test\\@127.0.0.1/logo.png",
        ]) {
          await expect(
            updatePlatformStoreConfiguration(
              container,
              provisioned.store_profile_id,
              {
                configuration: {
                  ...current.configuration,
                  locale: "ar-LY",
                  brand: {
                    ...current.configuration.brand,
                    logo_url: unsafeLogo,
                    typography_key: "cairo",
                  },
                },
                revision: current.revision,
              },
              "user_super_admin_test",
            ),
          ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
        }

        const saas = container.resolve(SAAS_MODULE) as any
        const marketplace = container.resolve(MARKETPLACE_MODULE) as any
        expect(
          (await saas.retrieveStoreProfile(provisioned.store_profile_id)).handle,
        ).toBe(provisioned.handle)
        const profile = await saas.retrieveStoreProfile(
          provisioned.store_profile_id,
        )
        expect(
          (await marketplace.retrieveVendor(profile.legacy_vendor_id)).handle,
        ).toBe(provisioned.handle)
      })
    })
  },
})
