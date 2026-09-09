import { normalizeMerchantProductVariants } from "../merchant-product-variants";

describe("merchant Product size/color variant contract", () => {
  it("normalizes bounded variant rows into Product options and Store prices", () => {
    expect(
      normalizeMerchantProductVariants(
        [
          { size: " S ", color: "Black", price: "12.500", stock: "4", sku: "TS-S-BLK" },
          { size: "M", color: "Black", price: 13, stock: 0, sku: "TS-M-BLK" },
          { size: "M", color: "White", price: 14, stock: 8 },
        ],
        "lyd",
      ),
    ).toEqual({
      options: [
        { title: "Size", values: ["S", "M"] },
        { title: "Color", values: ["Black", "White"] },
      ],
      variants: [
        {
          title: "S / Black",
          sku: "TS-S-BLK",
          options: { Size: "S", Color: "Black" },
          prices: [{ amount: 12.5, currency_code: "lyd" }],
          manage_inventory: true,
          allow_backorder: false,
          stocked_quantity: 4,
        },
        {
          title: "M / Black",
          sku: "TS-M-BLK",
          options: { Size: "M", Color: "Black" },
          prices: [{ amount: 13, currency_code: "lyd" }],
          manage_inventory: true,
          allow_backorder: false,
          stocked_quantity: 0,
        },
        {
          title: "M / White",
          sku: null,
          options: { Size: "M", Color: "White" },
          prices: [{ amount: 14, currency_code: "lyd" }],
          manage_inventory: true,
          allow_backorder: false,
          stocked_quantity: 8,
        },
      ],
    });
  });

  it("rejects duplicate combinations and SKUs", () => {
    expect(() =>
      normalizeMerchantProductVariants(
        [
          { size: "M", color: "Black", price: 10, stock: 1, sku: "SKU-1" },
          { size: "m", color: "black", price: 11, stock: 1, sku: "SKU-2" },
        ],
        "lyd",
      ),
    ).toThrow(/combination must be unique/i);

    expect(() =>
      normalizeMerchantProductVariants(
        [
          { size: "M", color: "Black", price: 10, stock: 1, sku: "SKU-1" },
          { size: "L", color: "Black", price: 11, stock: 1, sku: "sku-1" },
        ],
        "lyd",
      ),
    ).toThrow(/SKU must be unique/i);
  });

  it("rejects missing options, invalid prices, and excessive rows", () => {
    expect(() =>
      normalizeMerchantProductVariants(
        [{ size: "", color: "Black", price: 10, stock: 1 }],
        "lyd",
      ),
    ).toThrow(/size is invalid/i);
    expect(() =>
      normalizeMerchantProductVariants(
        [{ size: "M", color: "Black", price: "12.3456", stock: 1 }],
        "lyd",
      ),
    ).toThrow(/decimal places/i);
    expect(() =>
      normalizeMerchantProductVariants(
        Array.from({ length: 51 }, (_, index) => ({
          size: String(index),
          color: "Black",
          price: 10,
          stock: 1,
        })),
        "lyd",
      ),
    ).toThrow(/between 1 and 50/i);

    expect(() =>
      normalizeMerchantProductVariants(
        [{ size: "M", color: "Black", price: 10, stock: -1 }],
        "lyd",
      ),
    ).toThrow(/stock is invalid/i);
  });
});
