import { afterEach, describe, expect, it, vi } from "vitest";
import { addStorefrontCartItem, completeStorefrontCart, createStorefrontCart, prepareStorefrontSystemPayment, selectStorefrontShippingOption, updateStorefrontCheckoutAddress } from "./storefront-api";
import { getVisualPreviewCommerceCapabilities, getVisualPreviewPurchaseOptions, getVisualPreviewShippingOptions, template6CheckoutReferenceAddress } from "../dev/visual-preview";

afterEach(() => vi.unstubAllGlobals());
const preview = (search = "?preview=1&template=template-6") => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", { location: { search }, sessionStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
};
describe("shared cart quantity and Template 6 preview", () => {
  it("adds the requested quantity and computes the true line total", async () => {
    preview();
    const cart = await createStorefrontCart("lyd");
    const variant = getVisualPreviewPurchaseOptions("premium-hoodie")!.variants[0];
    const added = await addStorefrontCartItem(cart.id, variant.id, 3, "lyd");
    expect(added.items[0].quantity).toBe(3);
    expect(added.items[0].total).toBe(885);
    expect(added.item_subtotal).toBe(885);
    expect((await addStorefrontCartItem(cart.id, variant.id, 2, "lyd")).items[0].quantity).toBe(5);
  });
  it("rejects zero, negative, fractional and excessive quantities before mutation", async () => {
    preview();
    for (const quantity of [0, -1, 1.5, 21, NaN]) await expect(addStorefrontCartItem("preview-cart", "variant", quantity, "lyd")).rejects.toMatchObject({ code: "invalid_request" });
  });
  it("isolates reference shipping without changing shared Libya/LYD capabilities", () => {
    preview();
    expect(getVisualPreviewShippingOptions()).toEqual([{ id: "preview-six-standard", name: "Standard Delivery", amount: 20 }]);
    expect(getVisualPreviewCommerceCapabilities().online_checkout).toMatchObject({ currency_code: "lyd", country_codes: ["ly"], payment_methods: ["cod", "bank_transfer"] });
    preview("?preview=1&template=template-6&setup-preview=1");
    expect(getVisualPreviewShippingOptions().map(item => item.id)).toEqual(["preview-delivery", "preview-pickup"]);
    preview("?editor-preview=1&template=template-6");
    expect(getVisualPreviewShippingOptions().map(item => item.id)).toEqual(["preview-delivery", "preview-pickup"]);
  });
  it("carries selected quantities through a completely local COD confirmation without network calls", async () => {
    preview();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const cart = await createStorefrontCart("lyd");
    const variant = getVisualPreviewPurchaseOptions("premium-hoodie")!.variants[0];
    await addStorefrontCartItem(cart.id, variant.id, 2, "lyd");
    await updateStorefrontCheckoutAddress(cart.id, template6CheckoutReferenceAddress(), "lyd");
    await selectStorefrontShippingOption(cart.id, "preview-six-standard", "lyd");
    await prepareStorefrontSystemPayment(cart.id);
    const confirmation = await completeStorefrontCart(cart.id, "lyd", "cod");
    expect(confirmation).toMatchObject({ item_subtotal: 590, shipping_total: 20, total: 610, payment: { method: "cod", status: "pending_fulfillment" } });
    expect(confirmation.items[0].quantity).toBe(2);
    expect(fetch).not.toHaveBeenCalled();
  });
});
