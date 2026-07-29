import { Modules } from "@medusajs/framework/utils";

import {
  productPriceOrNull,
  resolveMerchantProductCurrency,
} from "../merchant-product-price";

const scope = (overrides: Record<string, unknown> = {}) => ({
  resolve: (key: string) => {
    if (key === Modules.STORE) {
      return {
        retrieveStore: jest.fn().mockResolvedValue({
          id: "store_a",
          default_region_id: "region_ly",
          metadata: { saas_allowed_region_ids: ["region_ly"] },
          supported_currencies: [{ currency_code: "lyd" }],
          ...(overrides.store as Record<string, unknown> | undefined),
        }),
      };
    }
    if (key === Modules.REGION) {
      return {
        retrieveRegion: jest.fn().mockResolvedValue({
          id: "region_ly",
          currency_code: "lyd",
          countries: [{ iso_2: "ly" }],
          ...(overrides.region as Record<string, unknown> | undefined),
        }),
      };
    }
    throw new Error(`Unexpected service: ${key}`);
  },
});

describe("merchant Product Store-currency authority", () => {
  it("derives the permanent Store currency and accepts only an exact match", async () => {
    await expect(
      resolveMerchantProductCurrency(scope() as any, "store_a"),
    ).resolves.toBe("lyd");
    await expect(
      resolveMerchantProductCurrency(scope() as any, "store_a", "LYD"),
    ).resolves.toBe("lyd");
    await expect(
      resolveMerchantProductCurrency(scope() as any, "store_a", "eur"),
    ).rejects.toThrow(/match the Store currency/i);
  });

  it("fails closed on ambiguous Store currency and validates decimal precision", async () => {
    await expect(
      resolveMerchantProductCurrency(
        scope({
          store: {
            supported_currencies: [
              { currency_code: "lyd" },
              { currency_code: "eur" },
            ],
          },
        }) as any,
        "store_a",
      ),
    ).rejects.toThrow(/currency is unavailable/i);

    expect(productPriceOrNull("12.345", "lyd")).toBe(12.345);
    expect(() => productPriceOrNull("12.3456", "lyd")).toThrow(
      /decimal places/i,
    );
    expect(() => productPriceOrNull("-1", "lyd")).toThrow(/non-negative/i);
  });
});
