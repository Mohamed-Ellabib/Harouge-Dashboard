import { describe, expect, it } from "vitest";

import { isAllowedStorefrontProxyRequest } from "../vite.config";

describe("storefront proxy allowlist", () => {
  it("allows only the contracted Storefront methods and paths", () => {
    expect(
      isAllowedStorefrontProxyRequest(
        "GET",
        "/store/saas/commerce-capabilities",
      ),
    ).toBe(true);
    expect(
      isAllowedStorefrontProxyRequest(
        "POST",
        "/store/carts/cart_123/line-items",
      ),
    ).toBe(true);
    expect(
      isAllowedStorefrontProxyRequest(
        "DELETE",
        "/store/carts/cart_123/line-items/item_123",
      ),
    ).toBe(true);
    expect(
      isAllowedStorefrontProxyRequest(
        "GET",
        "/store/shipping-options?cart_id=cart_123",
      ),
    ).toBe(true);
  });

  it("rejects Admin, vendor, customer-auth, and unlisted Store routes", () => {
    expect(isAllowedStorefrontProxyRequest("GET", "/admin/users")).toBe(false);
    expect(isAllowedStorefrontProxyRequest("POST", "/vendor/auth/login")).toBe(
      false,
    );
    expect(isAllowedStorefrontProxyRequest("POST", "/store/customers")).toBe(
      false,
    );
    expect(
      isAllowedStorefrontProxyRequest("DELETE", "/store/carts/cart_123"),
    ).toBe(false);
    expect(
      isAllowedStorefrontProxyRequest(
        "POST",
        "/store/payment-collections/pc_123/payment-sessions/provider_chooser",
      ),
    ).toBe(false);
  });
});
