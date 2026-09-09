import {
  createProductsWorkflow,
  createSalesChannelsWorkflow,
} from "@medusajs/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import {
  listStoreProductLinks,
  storeProductLinkDefinition,
  storeProfileStoreLinkDefinition,
} from "../../src/api/_utils/legacy-vendor-compatibility"
import { resolveMerchantStoreContext } from "../../src/api/_utils/merchant-store-context"
import {
  getVendorSessionVersion,
} from "../../src/api/_utils/vendor-auth"
import { vendorLoginRateLimiter } from "../../src/api/_utils/vendor-login-rate-limit"
import { vendorProductLinkDefinition } from "../../src/api/_utils/vendors"
import {
  runLegacyVendorBackfill,
} from "../../src/modules/saas/backfill"
import {
  createSecurityFixtures,
  type SecurityFixtures,
} from "../helpers/security-fixtures"

const testEnv = {
  NODE_ENV: "test",
  JWT_SECRET: "test-only-jwt-secret-not-for-production",
  COOKIE_SECRET: "test-only-cookie-secret-not-for-production",
  VENDOR_SESSION_SECRET: "test-only-vendor-secret-not-for-production",
  STORE_CORS: "http://127.0.0.1:8000",
  ADMIN_CORS: "http://127.0.0.1:9000",
  AUTH_CORS: "http://127.0.0.1:5175",
}

const cookieFrom = (response: any): string =>
  response.headers["set-cookie"][0].split(";")[0]

medusaIntegrationTestRunner({
  cwd: process.cwd(),
  env: testEnv,
  testSuite: ({ api, getContainer }) => {
    describe("Phase 2A permanent store architecture", () => {
      let fixtures: SecurityFixtures

      beforeEach(async () => {
        vendorLoginRateLimiter.reset()
        fixtures = await createSecurityFixtures(getContainer())
      })

      const merchantRequest = () =>
        ({
          scope: getContainer(),
          vendor_auth: {
            member_id: fixtures.memberA.id,
            vendor_id: fixtures.vendorA.id,
            store_profile_id: fixtures.storeProfileA.id,
            session_version: getVendorSessionVersion(fixtures.memberA.metadata),
          },
        }) as any

      it("resolves owner and manager access through permanent membership", async () => {
        const owner = await resolveMerchantStoreContext(merchantRequest())

        expect(owner.tenantId).toBe(fixtures.tenantA.id)
        expect(owner.storeProfileId).toBe(fixtures.storeProfileA.id)
        expect(owner.medusaStoreId).toBe(fixtures.medusaStoreA.id)
        expect(owner.role).toBe("owner")

        const saas = getContainer().resolve("saas") as any
        await saas.updateMerchantMemberships({
          id: fixtures.membershipA.id,
          role: "manager",
        })
        const manager = await resolveMerchantStoreContext(merchantRequest())
        expect(manager.role).toBe("manager")
        expect(manager.permissions).not.toContain("store.manage")
      })

      it("fails closed for disabled memberships and suspended permanent owners", async () => {
        const saas = getContainer().resolve("saas") as any

        await saas.updateMerchantMemberships({
          id: fixtures.membershipA.id,
          status: "disabled",
        })
        await expect(
          resolveMerchantStoreContext(merchantRequest())
        ).rejects.toThrow(/membership is unavailable/i)

        await saas.updateMerchantMemberships({
          id: fixtures.membershipA.id,
          status: "active",
        })
        await saas.updateTenants({
          id: fixtures.tenantA.id,
          status: "suspended",
        })
        await expect(
          resolveMerchantStoreContext(merchantRequest())
        ).rejects.toThrow(/tenant is unavailable/i)

        await saas.updateTenants({
          id: fixtures.tenantA.id,
          status: "active",
        })
        await saas.updateStoreProfiles({
          id: fixtures.storeProfileA.id,
          status: "suspended",
        })
        await expect(
          resolveMerchantStoreContext(merchantRequest())
        ).rejects.toThrow(/store is unavailable/i)
      })

      it("enforces one-to-one StoreProfile and Medusa Store links", async () => {
        const link = getContainer().resolve(ContainerRegistrationKeys.LINK) as any

        await expect(
          link.create(
            storeProfileStoreLinkDefinition(
              fixtures.storeProfileB.id,
              fixtures.medusaStoreA.id
            )
          )
        ).rejects.toThrow(/multiple links/i)

        await link.dismiss(
          storeProfileStoreLinkDefinition(
            fixtures.storeProfileA.id,
            fixtures.medusaStoreA.id
          )
        )
        await expect(
          resolveMerchantStoreContext(merchantRequest())
        ).rejects.toThrow(/missing or ambiguous/i)
      })

      it("writes canonical Store product ownership and rejects a second owner", async () => {
        const login = await api.post("/vendor/auth/login", {
          email: fixtures.memberA.email,
          password: fixtures.passwordA,
        })
        const product = (
          await api.post(
            "/vendor/products",
            {
              title: "Canonical Product A",
              handle: "canonical-product-a",
              status: "published",
              price: 1000,
              currency_code: "lyd",
            },
            { headers: { Cookie: cookieFrom(login) } }
          )
        ).data.product
        const links = await listStoreProductLinks(getContainer(), {
          product_id: product.id,
        })

        expect(links).toEqual([
          expect.objectContaining({
            store_id: fixtures.medusaStoreA.id,
            product_id: product.id,
          }),
        ])

        const link = getContainer().resolve(ContainerRegistrationKeys.LINK) as any
        await expect(
          link.create(
            storeProductLinkDefinition(fixtures.medusaStoreB.id, product.id)
          )
        ).rejects.toThrow(/multiple links/i)

        await link.dismiss(
          storeProductLinkDefinition(fixtures.medusaStoreA.id, product.id)
        )
        await link.create(
          storeProductLinkDefinition(fixtures.medusaStoreB.id, product.id)
        )
        const publicHeaders = {
          Host: "store-a.example.test",
          "x-publishable-api-key": fixtures.apiKeyA.token,
        }
        const publicList = await api.get("/store/products", {
          headers: publicHeaders,
        })
        expect(
          publicList.data.products.map((candidate: any) => candidate.id)
        ).not.toContain(product.id)
        const publicDetail = await api.get(
          "/store/products/" + product.id,
          {
            headers: publicHeaders,
            validateStatus: () => true,
          }
        )
        expect(publicDetail.status).toBe(404)
      })

      it("requires verified permanent domains for public resolution", async () => {
        const saas = getContainer().resolve("saas") as any
        const domains = await saas.listStoreDomains({
          store_profile_id: fixtures.storeProfileA.id,
        })
        await saas.updateStoreDomains({
          id: domains[0].id,
          verification_status: "pending",
        })

        const response = await api.get("/store/vendors/resolve", {
          headers: {
            Host: "store-a.example.test",
            "x-publishable-api-key": fixtures.apiKeyA.token,
          },
          validateStatus: () => true,
        })
        expect(response.status).toBe(404)
      })

      it("backfills a legacy Vendor dry-run first, applies, and reruns idempotently", async () => {
        const container = getContainer()
        const marketplace = fixtures.marketplace
        const { result: channels } = await createSalesChannelsWorkflow(container).run({
          input: {
            salesChannelsData: [{ name: "Phase 2A Legacy Channel C" }],
          },
        })
        const channel = channels[0]
        const vendor = await marketplace.createVendors({
          name: "Legacy Store C",
          handle: "legacy-store-c",
          status: "active",
          metadata: { sales_channel_id: channel.id },
        } as any)
        const member = await marketplace.createVendorMembers({
          vendor_id: vendor.id,
          email: "legacy-c@example.test",
          role: "manager",
          status: "active",
        } as any)
        await marketplace.createVendorDomains({
          vendor_id: vendor.id,
          domain: "LEGACY-C.EXAMPLE.TEST.:443",
          is_primary: true,
        } as any)
        const fulfillment = container.resolve(Modules.FULFILLMENT) as any
        const shippingProfiles = await fulfillment.listShippingProfiles(
          {},
          { take: 1 }
        )
        const { result: products } = await createProductsWorkflow(container).run({
          input: {
            products: [
              {
                title: "Legacy Product C",
                handle: "legacy-product-c",
                status: "published",
                shipping_profile_id: shippingProfiles[0].id,
                sales_channels: [{ id: channel.id }],
                options: [{ title: "Default", values: ["Default"] }],
                variants: [
                  {
                    title: "Legacy Product C",
                    manage_inventory: false,
                    allow_backorder: true,
                    options: { Default: "Default" },
                  },
                ],
              },
            ],
          } as any,
        })
        const product = products[0]
        const link = container.resolve(ContainerRegistrationKeys.LINK) as any
        await link.create(vendorProductLinkDefinition(vendor.id, product.id))

        const saas = container.resolve("saas") as any
        const beforeProfiles = (await saas.listStoreProfiles()).length
        const dryRun = await runLegacyVendorBackfill(container)

        expect(dryRun.mode).toBe("dry-run")
        expect(dryRun.counts.store_profiles_created).toBe(1)
        expect(await saas.listStoreProfiles()).toHaveLength(beforeProfiles)

        const applied = await runLegacyVendorBackfill(container, { apply: true })
        expect(applied.counts.conflicts).toBe(0)
        expect(applied.counts.store_profiles_created).toBe(1)
        expect(applied.counts.memberships_created).toBe(1)
        expect(applied.counts.products_linked).toBe(1)

        const profiles = await saas.listStoreProfiles({
          legacy_vendor_id: vendor.id,
        })
        expect(profiles).toHaveLength(1)
        expect(
          await saas.listMerchantMemberships({
            store_profile_id: profiles[0].id,
            merchant_account_reference: member.id,
          })
        ).toHaveLength(1)
        expect(await listStoreProductLinks(container, {
          product_id: product.id,
        })).toHaveLength(1)
        await expect(marketplace.retrieveVendor(vendor.id)).resolves.toBeTruthy()

        const rerun = await runLegacyVendorBackfill(container, { apply: true })
        expect(rerun.counts.store_profiles_created).toBe(0)
        expect(rerun.counts.memberships_created).toBe(0)
        expect(rerun.counts.products_linked).toBe(0)
        expect(
          await saas.listStoreProfiles({ legacy_vendor_id: vendor.id })
        ).toHaveLength(1)
      })

      it("reports ambiguous legacy conflicts without writing permanent records", async () => {
        const container = getContainer()
        const marketplace = fixtures.marketplace
        const { result: channels } = await createSalesChannelsWorkflow(container).run({
          input: {
            salesChannelsData: [
              { name: "Conflict Channel D" },
              { name: "Conflict Channel E" },
            ],
          },
        })
        const vendorD = await marketplace.createVendors({
          name: "Conflict Store D",
          handle: "conflict-store-d",
          status: "active",
          metadata: { sales_channel_id: channels[0].id },
        } as any)
        const vendorE = await marketplace.createVendors({
          name: "Conflict Store E",
          handle: "conflict-store-e",
          status: "active",
          metadata: { sales_channel_id: channels[1].id },
        } as any)
        const missingChannel = await marketplace.createVendors({
          name: "Missing Channel Store",
          handle: "missing-channel-store",
          status: "active",
          metadata: null,
        } as any)

        await marketplace.createVendorDomains([
          {
            vendor_id: vendorD.id,
            domain: "DUPLICATE.EXAMPLE.TEST",
            is_primary: true,
          },
          {
            vendor_id: vendorE.id,
            domain: "duplicate.example.test:443",
            is_primary: true,
          },
        ] as any)
        await marketplace.createVendorMembers([
          {
            vendor_id: vendorD.id,
            email: "ambiguous@example.test",
            role: "owner",
            status: "active",
          },
          {
            vendor_id: vendorE.id,
            email: "ambiguous@example.test",
            role: "manager",
            status: "active",
          },
        ] as any)

        const report = await runLegacyVendorBackfill(container)
        const codes = report.conflicts.map((entry) => entry.code)
        expect(codes).toContain("duplicate_normalized_domain")
        expect(codes).toContain("ambiguous_merchant_account")
        expect(codes).toContain("vendor_missing_sales_channel")
        expect(report.counts.conflicts).toBe(report.conflicts.length)
        expect(report.counts.unresolved_records).toBe(report.conflicts.length)

        const saas = container.resolve("saas") as any
        expect(
          await saas.listStoreProfiles({
            legacy_vendor_id: [vendorD.id, vendorE.id, missingChannel.id],
          })
        ).toHaveLength(0)
      })
    })
  },
})

jest.setTimeout(360_000)
