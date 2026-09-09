import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Template6OrderConfirmationPage, { Template6ConfirmationContent } from "./Template6OrderConfirmationPage";
import { template6ConfirmationReference, template6Progress, template6SelectTrackedOrder } from "./template-6-confirmation";
import { template6ConfirmationDesignFixture } from "../../dev/template-6-confirmation-preview";
import { getVisualPreviewProfile } from "../../dev/visual-preview";
import type { ConfiguredStorefrontProfileDto, StorefrontOrderConfirmationDto } from "../../types";

const context = vi.hoisted(() => ({ value: {} }));
vi.mock("../../commerce/CartContext", () => ({ useCart: () => context.value }));
const profile = () => ({ ...getVisualPreviewProfile("?template=template-6"), name: "Owner Store" }) as ConfiguredStorefrontProfileDto;
const order: StorefrontOrderConfirmationDto = { display_id: 57, currency_code: "lyd", items: [{ title: "Owner item", thumbnail_url: "/owner-photo.webp", variant_title: "XL / Navy", quantity: 3, unit_price: 10, total: 30 }], item_subtotal: 30, shipping_total: 7, total: 37, payment: { method: "cod", status: "pending_fulfillment" } };
function render(search = "", overrides = {}) {
  vi.stubGlobal("window", { location: { pathname: "/order-confirmation", search } });
  context.value = { confirmation: order, restoring: false, indeterminateCompletion: false, ...overrides };
  return renderToStaticMarkup(<Template6OrderConfirmationPage profile={profile()} />);
}
describe("Template 6 order confirmation", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("keeps the live receipt authoritative even in standalone preview", () => {
    for (const search of ["", "?preview=1&template=template-6", "?editor-preview=1&template=template-6", "?preview=1&setup-preview=1&template=template-6"]) {
      const html = render(search);
      for (const text of ["#57", "Owner Store", "Owner item", "Navy", "quantity 3", "/owner-photo.webp", "3 items", "LYD", "37.000", "Due on delivery", "Cash on Delivery", "Awaiting store update", "TRACK ORDER", "package-neutral-v1.webp"]) expect(html).toContain(text);
      for (const text of ["ZARA", "Arafat", "Visa", "AED", "Total paid", "2–3 business days", "on their way", "when your order ships"]) expect(html).not.toContain(text);
      expect(html).not.toContain("<nav");
    }
  });
  it("shows the read-only reference anatomy without modifying the commerce method", () => {
    vi.stubGlobal("window", { location: { pathname: "/order-confirmation", search: "?preview=1&template=template-6" } });
    const design = template6ConfirmationDesignFixture();
    const html = renderToStaticMarkup(<Template6ConfirmationContent profile={profile()} order={design.order} design={design} onTrack={() => {}} />);
    for (const text of ["ORD-10482", "ORDER PLACED!", "Arafat", "ZARA Brand Store", "Visa ending in 4242", "AED 560.00", "2–3 business days", "Apartment 1204", "cart-premium-hoodie", "cart-urban-jacket", "TRACK ORDER", "CONTINUE SHOPPING"]) expect(html).toContain(text);
    expect(design.order.payment.method).toBe("cod");
  });
  it("never falls back to the reference for empty live, editor, or creation sessions", () => {
    for (const search of ["", "?editor-preview=1", "?preview=1&setup-preview=1"]) {
      const html = render(search, { confirmation: null });
      expect(html).toContain("Confirmation session ended");
      expect(html).not.toContain("ORDER PLACED!");
      expect(html).not.toContain("ORD-10482");
    }
  });
  it("withholds success during restoring and indeterminate completion", () => {
    for (const [overrides, message] of [[{ restoring: true }, "Loading confirmation"], [{ indeterminateCompletion: true }, "Check your order result"]] as const) {
      const html = render("?preview=1&template=template-6", overrides);
      expect(html).toContain(message);
      expect(html).not.toContain("ORDER PLACED!");
      expect(html).not.toContain("TRACK ORDER");
    }
  });
  it("retains successful bank instructions without claiming payment was received", () => {
    const bankOrder: StorefrontOrderConfirmationDto = { ...order, payment: { method: "bank_transfer", status: "pending_verification", bank_transfer: { bank_name: "Fixture Bank", account_holder_name: "Fixture Holder", account_reference: "TEST-ONLY", instructions: "Fixture instructions" } } };
    const html = render("", { confirmation: bankOrder });
    for (const text of ["Awaiting verification", "Fixture Bank", "Fixture Holder", "TEST-ONLY", "Fixture instructions"]) expect(html).toContain(text);
    expect(html).not.toContain("Total paid");
    expect(html).not.toContain("Visa");
  });
  it("restricts the fixture to standalone DEV and selects tracking only from authorized results", () => {
    expect(template6ConfirmationReference(true, true, false, "?preview=1")).toBe(true);
    expect(template6ConfirmationReference(false, true, false, "")).toBe(false);
    expect(template6ConfirmationReference(true, false, false, "")).toBe(false);
    expect(template6ConfirmationReference(true, true, true, "")).toBe(false);
    expect(template6ConfirmationReference(true, true, false, "?setup-preview=1")).toBe(false);
    const tracked = { ...order, progress: "shipped" as const, created_at: "2026-09-06", updated_at: "2026-09-06" };
    expect(template6SelectTrackedOrder([tracked], order)).toBe(tracked);
    expect(template6SelectTrackedOrder([tracked], { ...order, display_id: 58 })).toBeNull();
    expect(template6Progress("shipped").title).toBe("Shipped");
    expect(template6Progress("processing").title).toBe("Preparing your order");
    expect(template6Progress("delivered").title).toBe("Delivered");
    expect(template6Progress().title).toBe("Confirmed");
  });
});
