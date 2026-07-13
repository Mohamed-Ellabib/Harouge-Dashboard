import { moduleIntegrationTestRunner } from "@medusajs/test-utils"

import { SAAS_MODULE } from ".."
import type SaasModuleService from "../service"

moduleIntegrationTestRunner<SaasModuleService>({
  moduleName: SAAS_MODULE,
  resolve: "./src/modules/saas",
  cwd: process.cwd(),
  testSuite: ({ service }) => {
    const createTenant = (name = "Module Tenant") =>
      service.createTenants({ name, status: "active" } as any)

    it("creates a Tenant with multiple StoreProfiles", async () => {
      const tenant = await createTenant()
      const stores = await service.createStoreProfiles([
        {
          tenant_id: tenant.id,
          handle: "module-store-one",
          status: "active",
          plan_code: "starter_whatsapp",
        },
        {
          tenant_id: tenant.id,
          handle: "module-store-two",
          status: "draft",
          plan_code: "professional_commerce",
        },
      ] as any)

      expect(stores).toHaveLength(2)
      expect(
        await service.listStoreProfiles({ tenant_id: tenant.id } as any)
      ).toHaveLength(2)
    })

    it("rejects duplicate active handles", async () => {
      const tenant = await createTenant()
      await service.createStoreProfiles({
        tenant_id: tenant.id,
        handle: "unique-store",
      } as any)

      await expect(
        service.createStoreProfiles({
          tenant_id: tenant.id,
          handle: "unique-store",
        } as any)
      ).rejects.toThrow()
    })

    it("rejects duplicate normalized hostnames and multiple primary domains", async () => {
      const tenant = await createTenant()
      const storeA = await service.createStoreProfiles({
        tenant_id: tenant.id,
        handle: "domain-store-a",
      } as any)
      const storeB = await service.createStoreProfiles({
        tenant_id: tenant.id,
        handle: "domain-store-b",
      } as any)

      await service.createStoreDomains({
        store_profile_id: storeA.id,
        normalized_hostname: "shop.example.test",
        type: "custom",
        verification_status: "verified",
        is_primary: true,
      } as any)

      await expect(
        service.createStoreDomains({
          store_profile_id: storeB.id,
          normalized_hostname: "shop.example.test",
        } as any)
      ).rejects.toThrow()
      await expect(
        service.createStoreDomains({
          store_profile_id: storeA.id,
          normalized_hostname: "other.example.test",
          is_primary: true,
        } as any)
      ).rejects.toThrow()
    })

    it("enforces membership uniqueness for each merchant and store", async () => {
      const tenant = await createTenant()
      const store = await service.createStoreProfiles({
        tenant_id: tenant.id,
        handle: "membership-store",
      } as any)
      const membership = {
        store_profile_id: store.id,
        merchant_account_reference: "merchant_account_a",
        role: "owner",
        status: "active",
      }

      await service.createMerchantMemberships(membership as any)
      await expect(
        service.createMerchantMemberships(membership as any)
      ).rejects.toThrow()
    })

    it("rejects unsupported statuses, roles, and plan codes", async () => {
      const tenant = await createTenant()
      await expect(
        service.createStoreProfiles({
          tenant_id: tenant.id,
          handle: "invalid-plan",
          status: "active",
          plan_code: "unlimited",
        } as any)
      ).rejects.toThrow()

      const store = await service.createStoreProfiles({
        tenant_id: tenant.id,
        handle: "valid-plan",
      } as any)
      await expect(
        service.createMerchantMemberships({
          store_profile_id: store.id,
          merchant_account_reference: "merchant_invalid",
          role: "administrator",
        } as any)
      ).rejects.toThrow()
    })

    it("allows only one active brand record per StoreProfile", async () => {
      const tenant = await createTenant()
      const store = await service.createStoreProfiles({
        tenant_id: tenant.id,
        handle: "brand-store",
      } as any)

      await service.createStoreBrands({
        store_profile_id: store.id,
        primary_color: "#112233",
      } as any)
      await expect(
        service.createStoreBrands({
          store_profile_id: store.id,
          primary_color: "#445566",
        } as any)
      ).rejects.toThrow()
    })
  },
})
