import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Template6CheckoutPage from "./Template6CheckoutPage";
import { getVisualPreviewProfile } from "../../dev/visual-preview";
import type { ConfiguredStorefrontProfileDto, StorefrontCartDto } from "../../types";

const state = vi.hoisted(() => ({ value: {} }));
vi.mock("../../commerce/CartContext", () => ({ useCart: () => state.value }));
const cart: StorefrontCartDto = { id: "cart-six", currency_code: "lyd", email: null, items: [{ id: "line", variant_id: "variant", product_handle: "premium-hoodie", title: "Owner hoodie", thumbnail_url: "/owner.webp", variant_title: "L / Navy", quantity: 2, unit_price: 295, total: 590 }], item_subtotal: 590, shipping_total: 0, total: 590, shipping_method_selected: false, payment_session_ready: false, completed: false };
function render(search: string, overrides = {}) {
  vi.stubGlobal("window", { location: { pathname: "/checkout", search } });
  state.value = { cart, capability: { online_checkout: { status: "available", currency_code: "lyd", country_codes: ["ly"], payment_methods: ["cod", "bank_transfer"] } }, pending: false, restoring: false, indeterminateCompletion: false, error: null, ...overrides };
  const profile = getVisualPreviewProfile("?template=template-6") as ConfiguredStorefrontProfileDto;
  profile.name = "Owner Store";
  return renderToStaticMarkup(<Template6CheckoutPage profile={profile} />);
}
describe("Template 6 checkout", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uses actual cart, seller, currency and supported methods outside standalone reference", () => {
    const html = render("");
    for (const copy of ["CHECKOUT", "Delivery Address", "Delivery Method", "Payment Method", "Your Order", "Owner Store", "Owner hoodie", "Navy", "Qty 2", "/owner.webp", "Cash on Delivery", "Manual bank transfer"]) expect(html).toContain(copy);
    for (const copy of ["Visa ending", "Add a new card", "ZARA", "AED", "Arafat"]) expect(html).not.toContain(copy);
    expect(html).toContain("Add your delivery address");
    expect(html).toContain('class="six-checkout-place" disabled=""');
    expect(html).not.toContain('<nav');
  });
  it("exposes sample Visa only in standalone DEV, never editor or creation preview", () => {
    expect(render("?preview=1&template=template-6")).toContain("Sample Visa ending in 4242 — card payments are not connected");
    for (const search of ["?preview=1&setup-preview=1&template=template-6", "?editor-preview=1&template=template-6"]) {
      const html = render(search);
      expect(html).not.toContain("Visa ending");
      expect(html).not.toContain("AED");
      expect(html).toContain("Owner Store");
    }
  });
  it("renders empty, restoring, unavailable and indeterminate states without a place-order button", () => {
    const scenarios = [
      [{ cart: null }, "Your cart is empty"],
      [{ restoring: true }, "Preparing checkout"],
      [{ indeterminateCompletion: true }, "CHECK ORDER RESULT"],
      [{ capability: { online_checkout: { status: "unavailable", country_codes: [], payment_methods: [] } } }, "Checkout is currently unavailable"],
    ] as const;
    for (const [overrides, copy] of scenarios) {
      const html = render("", overrides);
      expect(html).toContain(copy);
      expect(html).not.toContain("six-checkout-place");
    }
  });
});
