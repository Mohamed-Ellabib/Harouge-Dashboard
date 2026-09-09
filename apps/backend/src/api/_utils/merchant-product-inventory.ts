import {
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/core-flows";
import type { MedusaRequest } from "@medusajs/framework/http";
import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";

type ProductRecord = Record<string, any>;

type VariantStockInput = {
  variant_id: string;
  stock: number;
};

type InventoryScopeInput = MedusaRequest | MedusaContainer;

const scopeFor = (input: InventoryScopeInput): MedusaContainer =>
  "scope" in input ? input.scope : input;

const invalidInventory = () =>
  new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Product inventory could not be updated.",
  );

export const resolveStoreStockLocationId = async (
  req: InventoryScopeInput,
  medusaStoreId: string,
): Promise<string | null> => {
  const storeService = scopeFor(req).resolve(Modules.STORE) as any;
  const store = await storeService.retrieveStore(medusaStoreId).catch(() => null);

  return typeof store?.default_location_id === "string" &&
    store.default_location_id
    ? store.default_location_id
    : null;
};

const inventoryBindings = async (
  req: InventoryScopeInput,
  variantIds: string[],
  stockLocationId: string,
) => {
  if (!variantIds.length) {
    return new Map<string, Record<string, any>>();
  }

  const query = scopeFor(req).resolve(ContainerRegistrationKeys.QUERY) as any;
  const { data: links = [] } = await query.graph({
    entity: "product_variant_inventory_item",
    fields: ["variant_id", "inventory_item_id", "required_quantity"],
    filters: { variant_id: variantIds },
    pagination: { skip: 0, take: variantIds.length + 1 },
  } as any);
  const inventoryItemByVariant = new Map<string, string>();

  for (const link of links) {
    if (
      typeof link.variant_id !== "string" ||
      typeof link.inventory_item_id !== "string" ||
      Number(link.required_quantity) !== 1 ||
      inventoryItemByVariant.has(link.variant_id)
    ) {
      throw invalidInventory();
    }

    inventoryItemByVariant.set(link.variant_id, link.inventory_item_id);
  }

  const inventoryItemIds = [...inventoryItemByVariant.values()];
  const { data: levels = [] } = inventoryItemIds.length
    ? await query.graph({
        entity: "inventory_level",
        fields: [
          "id",
          "inventory_item_id",
          "location_id",
          "stocked_quantity",
          "reserved_quantity",
          "available_quantity",
        ],
        filters: {
          inventory_item_id: inventoryItemIds,
          location_id: stockLocationId,
        },
        pagination: { skip: 0, take: inventoryItemIds.length + 1 },
      } as any)
    : { data: [] };
  const levelByInventoryItem = new Map<string, Record<string, any>>();

  for (const level of levels) {
    if (
      typeof level.inventory_item_id !== "string" ||
      level.location_id !== stockLocationId ||
      levelByInventoryItem.has(level.inventory_item_id)
    ) {
      throw invalidInventory();
    }

    levelByInventoryItem.set(level.inventory_item_id, level);
  }

  return new Map(
    variantIds.flatMap((variantId) => {
      const inventoryItemId = inventoryItemByVariant.get(variantId);
      if (!inventoryItemId) {
        return [];
      }

      return [
        [
          variantId,
          {
            inventory_item_id: inventoryItemId,
            level: levelByInventoryItem.get(inventoryItemId) ?? null,
          },
        ],
      ];
    }),
  );
};

export const addMerchantInventoryToProducts = async (
  req: InventoryScopeInput,
  products: ProductRecord[],
  stockLocationId: string | null,
): Promise<ProductRecord[]> => {
  if (!stockLocationId) {
    return products;
  }

  const trackedVariantIds = products.flatMap((product) =>
    Array.isArray(product.variants)
      ? product.variants
          .filter((variant: any) => variant.manage_inventory)
          .map((variant: any) => variant.id)
          .filter((id: unknown): id is string => typeof id === "string")
      : [],
  );
  const bindings = await inventoryBindings(
    req,
    [...new Set(trackedVariantIds)],
    stockLocationId,
  );

  return products.map((product) => ({
    ...product,
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant: any) => {
          const level = bindings.get(variant.id)?.level;

          return {
            ...variant,
            inventory_quantity: variant.manage_inventory
              ? Number(level?.stocked_quantity ?? 0)
              : null,
            available_quantity: variant.manage_inventory
              ? Number(level?.available_quantity ?? 0)
              : null,
          };
        })
      : [],
  }));
};

export const setMerchantVariantStocks = async (
  req: InventoryScopeInput,
  stockLocationId: string,
  stocks: VariantStockInput[],
): Promise<void> => {
  if (!stocks.length) {
    return;
  }

  const variantIds = stocks.map((entry) => entry.variant_id);
  if (new Set(variantIds).size !== variantIds.length) {
    throw invalidInventory();
  }

  const bindings = await inventoryBindings(req, variantIds, stockLocationId);
  if (bindings.size !== variantIds.length) {
    throw invalidInventory();
  }

  const creates: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];

  for (const entry of stocks) {
    const binding = bindings.get(entry.variant_id);
    if (!binding) {
      throw invalidInventory();
    }

    if (binding.level?.id) {
      updates.push({
        id: binding.level.id,
        inventory_item_id: binding.inventory_item_id,
        location_id: stockLocationId,
        stocked_quantity: entry.stock,
      });
    } else {
      creates.push({
        inventory_item_id: binding.inventory_item_id,
        location_id: stockLocationId,
        stocked_quantity: entry.stock,
      });
    }
  }

  if (creates.length) {
    await createInventoryLevelsWorkflow(scopeFor(req)).run({
      input: { inventory_levels: creates as any },
    });
  }

  if (updates.length) {
    await updateInventoryLevelsWorkflow(scopeFor(req)).run({
      input: { updates: updates as any },
    });
  }
};
