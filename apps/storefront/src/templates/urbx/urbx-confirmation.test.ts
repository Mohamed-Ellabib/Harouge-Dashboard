import { describe, expect, it } from "vitest";
import { mapStorefrontOrderConfirmationResponse } from "../../api/storefront-api";
import { urbxConfirmationDesignFixture } from "../../dev/urbx-confirmation-preview";

describe("URBX confirmation receipt", () => {
  it("retains only the safe purchased variant and thumbnail fields", () => {
    const { order } = urbxConfirmationDesignFixture();
    const result = mapStorefrontOrderConfirmationResponse({ type: "order", order: {
      ...order, items: order.items.map(item => ({ ...item, variant_title: "L / Black", metadata: { private: true } })),
    } }, "lyd");
    expect(result.items[0]).toEqual({ ...order.items[0], variant_title: "L / Black" });
    expect(result.total).toBe(168);
    expect(result.payment).not.toHaveProperty("bank_transfer");
  });
  it("keeps older receipts valid without inventing missing variants", () => {
    const { order } = urbxConfirmationDesignFixture();
    const result = mapStorefrontOrderConfirmationResponse({ type: "order", order }, "lyd");
    expect(result.items[0]).not.toHaveProperty("variant_title");
  });
  it("keeps the reference fixture independent and free of order capabilities", () => {
    const first = urbxConfirmationDesignFixture();
    first.order.items[0].quantity = 8;
    expect(urbxConfirmationDesignFixture().order.items[0].quantity).toBe(1);
    expect(first.order).not.toHaveProperty("tracking");
  });
});
