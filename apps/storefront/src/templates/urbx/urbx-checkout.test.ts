import { describe, expect, it } from "vitest";
import type { StorefrontCartDto } from "../../types";
import { canPlaceUrbxOrder, emptyUrbxAddress } from "./urbx-checkout";

const cart: StorefrontCartDto = { id: "cart-test", currency_code: "lyd", email: null, items: [{ id: "line-test", variant_id: "variant-test", title: "Hoodie", thumbnail_url: null, quantity: 1, unit_price: 89, total: 89 }], item_subtotal: 89, shipping_total: 0, total: 89, shipping_method_selected: true, payment_session_ready: false, completed: false };
describe("URBX checkout approval", () => {
  it("requires delivery reviewed for the same current cart", () => {
    expect(canPlaceUrbxOrder(cart, cart.id, "cod", ["cod"], false)).toBe(true);
    expect(canPlaceUrbxOrder(cart, null, "cod", ["cod"], false)).toBe(false);
    expect(canPlaceUrbxOrder(cart, "old-cart", "cod", ["cod"], false)).toBe(false);
    expect(canPlaceUrbxOrder({ ...cart, shipping_method_selected: false }, cart.id, "cod", ["cod"], false)).toBe(false);
  });
  it("blocks unsupported payments, pending/recovery and completed or empty carts", () => {
    expect(canPlaceUrbxOrder(cart, cart.id, "bank_transfer", ["cod"], false)).toBe(false);
    expect(canPlaceUrbxOrder(cart, cart.id, "cod", ["cod"], true)).toBe(false);
    expect(canPlaceUrbxOrder({ ...cart, completed: true }, cart.id, "cod", ["cod"], false)).toBe(false);
    expect(canPlaceUrbxOrder({ ...cart, items: [] }, cart.id, "cod", ["cod"], false)).toBe(false);
    expect(canPlaceUrbxOrder(null, null, "cod", ["cod"], false)).toBe(false);
  });
  it("never fills real customer details with a demo address", () => {
    expect(emptyUrbxAddress("ly")).toEqual({ first_name: "", last_name: "", address_1: "", email: "", city: "", country_code: "ly", phone: "" });
  });
});
