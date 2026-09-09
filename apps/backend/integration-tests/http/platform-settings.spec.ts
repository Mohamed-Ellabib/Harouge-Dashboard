import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaError } from "@medusajs/framework/utils"
import { randomBytes } from "node:crypto"

import {
  defaultPlatformSettings,
  readPlatformSettings,
  updatePlatformSettings,
} from "../../src/api/_utils/platform-settings"
import {
  createPlatformUser,
  deletePlatformUser,
  listPlatformUsers,
  resetPlatformUserPassword,
  updatePlatformUser,
} from "../../src/api/_utils/platform-users"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  env: {
    NODE_ENV: "test",
    JWT_SECRET: "test-only-jwt-secret-not-for-production",
    COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
    VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
    SAAS_TEMPORARY_DOMAIN_BASE: "local.test",
    SAAS_SUPPORTED_CURRENCIES: "lyd",
    STORE_CORS: "http://127.0.0.1:5176",
    ADMIN_CORS: "http://127.0.0.1:9000",
    AUTH_CORS: "http://127.0.0.1:5175",
    MEDUSA_FF_RBAC: "true",
  },
  testSuite: ({ getContainer }) => {
    describe("platform settings persistence", () => {
      it("persists one revisioned system record and rejects stale writes", async () => {
        const container = getContainer()
        const initial = await readPlatformSettings(container)
        expect(initial).toEqual({
          settings: defaultPlatformSettings,
          revision: 0,
          updated_at: null,
          updated_by: null,
        })

        const updated = await updatePlatformSettings(container, {
          settings: {
            ...defaultPlatformSettings,
            platformName: "LabibTech Control Plane",
          },
          revision: 0,
          actorId: "user_super_admin_test",
        })

        expect(updated.revision).toBe(1)
        expect(updated.settings.platformName).toBe("LabibTech Control Plane")
        await expect(readPlatformSettings(container)).resolves.toEqual(updated)

        await expect(
          updatePlatformSettings(container, {
            settings: defaultPlatformSettings,
            revision: 0,
            actorId: "user_stale_test",
          }),
        ).rejects.toMatchObject({ type: MedusaError.Types.CONFLICT })
      })

      it("normalizes safe inputs and rejects unsupported configuration", async () => {
        const container = getContainer()
        const current = await readPlatformSettings(container)
        const result = await updatePlatformSettings(container, {
          settings: {
            ...current.settings,
            supportEmail: "  OWNER@EXAMPLE.TEST ",
            companyWebsite: "example.test",
          },
          revision: current.revision,
          actorId: "user_super_admin_test",
        })

        expect(result.settings.supportEmail).toBe("owner@example.test")
        expect(result.settings.companyWebsite).toBe("https://example.test")

        await expect(
          updatePlatformSettings(container, {
            settings: { ...result.settings, defaultCurrency: "USD" },
            revision: result.revision,
            actorId: "user_super_admin_test",
          }),
        ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
      })

      it("manages database-backed Super Admin users without exposing credentials", async () => {
        const container = getContainer()
        const firstPassword = `${randomBytes(18).toString("base64url")}!9Aa`
        const secondPassword = `${randomBytes(18).toString("base64url")}!8Bb`
        const created = await createPlatformUser(container, {
          email: "platform-one@example.test",
          first_name: "Platform",
          last_name: "One",
          avatar_url: null,
          password: firstPassword,
        })
        const second = await createPlatformUser(container, {
          email: "platform-two@example.test",
          first_name: "Platform",
          last_name: "Two",
          avatar_url: null,
          password: secondPassword,
        })

        expect(created.user).toMatchObject({
          email: "platform-one@example.test",
          role: "Super Admin",
          status: "active",
        })
        expect(JSON.stringify({ created, second })).not.toMatch(/password|provider|metadata/i)
        expect((await listPlatformUsers(container)).users).toHaveLength(2)

        const updated = await updatePlatformUser(
          container,
          created.user.id,
          { first_name: "Updated", email: "platform-updated@example.test", avatar_url: "https://example.test/admin.png" },
          second.user.id,
        )
        expect(updated.user).toMatchObject({
          first_name: "Updated",
          email: "platform-updated@example.test",
          avatar_url: "https://example.test/admin.png",
        })

        await expect(
          resetPlatformUserPassword(container, created.user.id, {
            password: `${randomBytes(18).toString("base64url")}!7Cc`,
          }),
        ).resolves.toEqual({ updated: true })

        await expect(
          deletePlatformUser(container, second.user.id, second.user.id),
        ).rejects.toMatchObject({ type: MedusaError.Types.NOT_ALLOWED })
        await expect(
          deletePlatformUser(container, second.user.id, created.user.id),
        ).resolves.toEqual({ id: second.user.id, deleted: true })
      })
    })
  },
})
