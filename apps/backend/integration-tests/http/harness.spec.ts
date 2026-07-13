import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: {
    NODE_ENV: "test",
    JWT_SECRET: "test-only-jwt-secret-not-for-production",
    COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
    VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
    STORE_CORS: "http://127.0.0.1:8000",
    ADMIN_CORS: "http://127.0.0.1:9000",
    AUTH_CORS: "http://127.0.0.1:5173",
  },
  hooks: {
    beforeServerStart: async (container) => {
      const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
      const databaseUrl = config.projectConfig.databaseUrl

      if (!databaseUrl) {
        throw new Error("Medusa did not configure a disposable integration database.")
      }

      const target = new URL(databaseUrl)

      expect(target.hostname).toBe("localhost")
      expect(target.port).toBe("55432")
      expect(target.pathname).toMatch(/^\/medusa-.*-integration-\d+$/)
    },
  },
  testSuite: ({ api }) => {
    describe("backend HTTP integration harness", () => {
      it("starts Medusa against the disposable database", async () => {
        const response = await api.get("/health")

        expect(response.status).toBe(200)
        expect(response.data).toBe("OK")
      })
    })
  },
})

jest.setTimeout(120_000)
