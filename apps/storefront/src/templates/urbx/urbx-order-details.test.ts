import { describe, expect, it } from "vitest";
import { urbxOrderDetailsDesignFixture } from "../../dev/urbx-order-details-preview";
import { selectUrbxOrder, urbxOrderDate, urbxOrderDetailsPath, urbxOrderProgress } from "./urbx-order-details";

describe("URBX order details", () => {
  it("selects a requested public number only from authorized orders", () => {
    const saved = urbxOrderDetailsDesignFixture();
    expect(selectUrbxOrder([saved], null, String(saved.display_id))).toBe(saved);
    expect(selectUrbxOrder([saved], saved, "someone-elses-order")).toBeNull();
    expect(selectUrbxOrder([], null, null)).toBeNull();
    expect(selectUrbxOrder([saved], null, "")).toBeNull();
  });
  it("keeps merchant progress over the confirmation receipt and does not mutate history", () => {
    const receipt = urbxOrderDetailsDesignFixture();
    const newer = { ...receipt, progress: "shipped" as const };
    const older = { ...receipt, display_id: "old", created_at: "2026-09-01T12:00:00Z" };
    const input = [older, newer];
    expect(selectUrbxOrder(input, receipt, null)).toBe(newer);
    expect(selectUrbxOrder(input, null, null)).toBe(newer);
    expect(selectUrbxOrder([], receipt, String(receipt.display_id))).toBe(receipt);
    expect(input).toEqual([older, newer]);
  });
  it("maps all merchant statuses to the correct step, with no invented shipping date", () => {
    expect(["confirmed", "processing", "shipped", "delivered"].map(progress => urbxOrderProgress(progress as "confirmed").step)).toEqual([0, 1, 2, 3]);
    expect(urbxOrderProgress("processing").label).toBe("Preparing");
    expect(urbxOrderDate(undefined)).toBeNull();
    expect(urbxOrderDate("invalid")).toBeNull();
    expect(urbxOrderDate("2026-09-05T12:00:00Z")).toBe("5 Sep 2026");
  });
  it("encodes only the display number in navigation and keeps sample variants in the design fixture", () => {
    expect(urbxOrderDetailsPath("URBX/1?x")).toBe("/order-details/URBX%2F1%3Fx");
    const sample = urbxOrderDetailsDesignFixture();
    expect(sample.tracking).toBeUndefined();
    expect(sample.items.map(item => item.variant_title)).toEqual(["Black / Large", "Black / Medium"]);
    expect(sample.total).toBe(168);
  });
});
