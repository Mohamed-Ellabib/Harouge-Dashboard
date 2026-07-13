import {
  MERCHANT_PERMISSIONS,
  permissionsForMerchantRole,
  requireMerchantPermission,
  type MerchantStoreContext,
} from "../merchant-store-context"

describe("merchant role permissions", () => {
  it("gives owners every current merchant permission", () => {
    expect(permissionsForMerchantRole("owner")).toEqual(MERCHANT_PERMISSIONS)
  })

  it("allows managers to operate products and orders but not manage the store", () => {
    const permissions = permissionsForMerchantRole("manager")
    expect(permissions).toEqual([
      "products.read",
      "products.write",
      "orders.read",
      "store.read",
      "security.self",
    ])

    const context = { permissions } as MerchantStoreContext
    expect(() => requireMerchantPermission(context, "products.write")).not.toThrow()
    expect(() => requireMerchantPermission(context, "orders.read")).not.toThrow()
    expect(() => requireMerchantPermission(context, "store.manage")).toThrow(
      "cannot perform that operation"
    )
  })
})
