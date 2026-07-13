import { moduleIntegrationTestRunner } from "@medusajs/test-utils"

import { MARKETPLACE_MODULE } from ".."
import type MarketplaceModuleService from "../service"

moduleIntegrationTestRunner<MarketplaceModuleService>({
  moduleName: MARKETPLACE_MODULE,
  resolve: "./src/modules/marketplace",
  cwd: process.cwd(),
  testSuite: ({ service }) => {
    it("creates and retrieves an isolated vendor", async () => {
      const vendor = await service.createVendors({
        name: "Module Store A",
        handle: "module-store-a",
        status: "active",
      } as any)

      await expect(service.retrieveVendor(vendor.id)).resolves.toMatchObject({
        name: "Module Store A",
        handle: "module-store-a",
      })
    })

    it("keeps members assigned to their own vendor", async () => {
      const vendorA = await service.createVendors({
        name: "Module Store A",
        handle: "module-a",
        status: "active",
      } as any)
      const vendorB = await service.createVendors({
        name: "Module Store B",
        handle: "module-b",
        status: "active",
      } as any)
      await service.createVendorMembers({
        vendor_id: vendorA.id,
        email: "module-a@example.test",
        role: "owner",
        status: "active",
      } as any)
      await service.createVendorMembers({
        vendor_id: vendorB.id,
        email: "module-b@example.test",
        role: "owner",
        status: "active",
      } as any)

      const membersA = await service.listVendorMembers({ vendor_id: vendorA.id })
      expect(membersA).toHaveLength(1)
      expect(membersA[0].email).toBe("module-a@example.test")
    })
  },
})
