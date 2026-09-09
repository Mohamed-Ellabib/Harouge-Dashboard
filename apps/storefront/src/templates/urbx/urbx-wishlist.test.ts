import { describe, expect, it, vi } from "vitest";
import type { StorefrontPurchaseOptionsDto } from "../../types";
import { initialUrbxWishlistVariant, moveUrbxWishlistItem, urbxWishlistVariantLabel } from "./urbx-wishlist";

const variant = (size: string, available = true): StorefrontPurchaseOptionsDto["variants"][number] => ({
  id: `variant-${size}`, title: `${size} / Black`, options: { size, color: "Black" }, unit_price: 89, available_for_sale: available,
});

describe("URBX wishlist", () => {
  it("selects the preferred available size, never a sold-out default", () => {
    expect(initialUrbxWishlistVariant([variant("S"), variant("M")])?.id).toBe("variant-M");
    expect(initialUrbxWishlistVariant([variant("M"), variant("L")], "L")?.id).toBe("variant-L");
    expect(initialUrbxWishlistVariant([variant("M", false), variant("S")])?.id).toBe("variant-S");
    expect(initialUrbxWishlistVariant([variant("M", false)])?.available_for_sale).toBe(false);
    expect(initialUrbxWishlistVariant([])).toBeUndefined();
  });
  it("keeps size/color variants distinguishable and supports products without sizes", () => {
    expect(urbxWishlistVariantLabel(variant("M"), false)).toBe("Size: M");
    expect(urbxWishlistVariantLabel(variant("L"), true)).toBe("Size: L / Black");
    expect(urbxWishlistVariantLabel({ ...variant("M"), title: "One size", options: { size: null, color: null } }, false)).toBe("One size");
  });
  it("removes the saved item only after the selected variant has reached the cart", async () => {
    const events: string[] = [];
    await moveUrbxWishlistItem("variant-L", async id => { events.push(id); }, () => { events.push("remove"); });
    expect(events).toEqual(["variant-L", "remove"]);
  });
  it("preserves the wishlist when adding to the cart fails", async () => {
    const remove = vi.fn();
    await expect(moveUrbxWishlistItem("variant-L", async () => { throw new Error("Unavailable"); }, remove)).rejects.toThrow("Unavailable");
    expect(remove).not.toHaveBeenCalled();
  });
});
