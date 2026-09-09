import { describe, expect, it } from "vitest";
import { urbxCartVariant } from "./urbx-cart";

describe("URBX cart variant presentation", () => {
  it("uses the real selected size and color", () => {
    expect(urbxCartVariant("L / Black")).toBe("Black / Large");
    expect(urbxCartVariant("M / Black")).toBe("Black / Medium");
    expect(urbxCartVariant("S / Blue")).toBe("Blue / Small");
  });
  it("preserves custom variants without guessing their options", () => {
    expect(urbxCartVariant("One size / Washed green")).toBe("One size / Washed green");
    expect(urbxCartVariant("Black / Large")).toBe("Black / Large");
  });
  it("does not invent missing choices", () => {
    expect(urbxCartVariant(undefined)).toBeNull();
    expect(urbxCartVariant(null)).toBeNull();
    expect(urbxCartVariant("Default variant")).toBeNull();
  });
});
