import { describe, expect, it } from "vitest";
import { template6CartFavorite, template6CartPhoto, template6CartSummary, template6CartVariant } from "./template-6-cart";
import type { StorefrontCartDto } from "../../types";

const item = { id: "line", variant_id: "variant", title: "Premium Hoodie", product_handle: "premium-hoodie", thumbnail_url: "/owner-photo.webp", quantity: 1, unit_price: 295, total: 295 };
const cart: StorefrontCartDto = { id: "cart", currency_code: "lyd", email: null, items: [item, { ...item, id: "second", title: "Urban Jacket", unit_price: 245, total: 245 }], item_subtotal: 540, shipping_total: 0, total: 540, shipping_method_selected: false, payment_session_ready: false, completed: false };
describe("Template 6 cart presentation", () => {
  it("uses saved thumbnails outside the standalone reference and never invents an absent photo", () => {
    expect(template6CartPhoto(item, false)).toBe("/owner-photo.webp");
    expect(template6CartPhoto(item, true)).toContain("cart-premium-hoodie-v1.webp");
    expect(template6CartPhoto({ ...item, thumbnail_url: null }, false)).toBeNull();
  });
  it("preserves shared totals and unknown delivery; the AED20 estimate is preview-only", () => {
    expect(template6CartSummary(cart, false)).toEqual({ count: 2, subtotal: 540, delivery: null, total: 540 });
    expect(template6CartSummary(cart, true)).toEqual({ count: 2, subtotal: 540, delivery: 20, total: 560 });
    expect(cart.shipping_method_selected).toBe(false);
    expect(template6CartSummary({ ...cart, total: 550, shipping_total: 10, shipping_method_selected: true }, true).total).toBe(550);
    expect(template6CartSummary({ ...cart, items: [], item_subtotal: 0, total: 0 }, true).delivery).toBe(0);
  });
  it("keeps saved size/color titles without inventing Black on real products", () => {
    expect(template6CartVariant("L / Navy")).toBe("Navy · Size L");
    expect(template6CartVariant("M")).toBe("Size M");
    expect(template6CartVariant("L", true)).toBe("Black · Size L");
    expect(template6CartVariant("Standard", true)).toBeNull();
    expect(template6CartVariant("Made to measure")).toBe("Made to measure");
  });
  it("saves the actual line product and refuses missing product handles", () => {
    expect(template6CartFavorite(item)).toMatchObject({ handle: "premium-hoodie", title: "Premium Hoodie", thumbnail_url: "/owner-photo.webp", price_lyd: 295 });
    expect(template6CartFavorite({ ...item, product_handle: null })).toBeNull();
  });
});
