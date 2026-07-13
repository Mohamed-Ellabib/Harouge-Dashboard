import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import {
  linkCartToStore,
  linkOrderToStore,
  listStoreCartLinks,
  listStoreOrderLinks,
} from "../../api/_utils/checkout-ownership-links";
import {
  listStoreProductLinks,
  listStoreProfileStoreLinks,
} from "../../api/_utils/legacy-vendor-compatibility";
import { assertBackfillApplySafety } from "./backfill";

export type CheckoutBackfillConflict = {
  kind: "cart" | "order";
  id: string;
  code: string;
};

export type CheckoutBackfillCounts = {
  carts_inspected: number;
  orders_inspected: number;
  carts_already_owned: number;
  orders_already_owned: number;
  carts_linked: number;
  orders_linked: number;
  unowned_carts: number;
  unowned_orders: number;
  mixed_store_carts: number;
  mixed_store_orders: number;
  channel_store_mismatches: number;
  products_missing_ownership: number;
  ambiguous_ownership: number;
  conflicts: number;
  unresolved_records: number;
};

export type CheckoutBackfillReport = {
  mode: "dry-run" | "apply";
  counts: CheckoutBackfillCounts;
  conflicts: CheckoutBackfillConflict[];
};

type BackfillOptions = { apply?: boolean };
type CoreRecord = {
  id: string;
  sales_channel_id?: string | null;
  items?: Record<string, any>[];
};

const emptyCounts = (): CheckoutBackfillCounts => ({
  carts_inspected: 0,
  orders_inspected: 0,
  carts_already_owned: 0,
  orders_already_owned: 0,
  carts_linked: 0,
  orders_linked: 0,
  unowned_carts: 0,
  unowned_orders: 0,
  mixed_store_carts: 0,
  mixed_store_orders: 0,
  channel_store_mismatches: 0,
  products_missing_ownership: 0,
  ambiguous_ownership: 0,
  conflicts: 0,
  unresolved_records: 0,
});

const addConflict = (
  report: CheckoutBackfillReport,
  kind: "cart" | "order",
  id: string,
  code: string,
): void => {
  report.conflicts.push({ kind, id, code });
  report.counts.conflicts += 1;
  report.counts.unresolved_records += 1;
};

const itemProductIds = (record: CoreRecord): string[] =>
  (record.items ?? [])
    .map(
      (item) =>
        item.product_id ??
        item.variant?.product_id ??
        item.variant?.product?.id,
    )
    .filter((id): id is string => typeof id === "string" && Boolean(id));

const graphRecords = async (
  query: any,
  entity: "cart" | "order",
): Promise<CoreRecord[]> => {
  const { data = [] } = await query.graph({
    entity,
    fields: [
      "id",
      "sales_channel_id",
      "items.id",
      "items.product_id",
      "items.variant.product_id",
    ],
    pagination: { skip: 0, take: 10000 },
  } as any);

  return data;
};

const uniqueOwner = (
  links: Record<string, any>[],
  idField: "cart_id" | "order_id",
  id: string,
): string | null => {
  const matches = links.filter((link) => link[idField] === id);
  return matches.length === 1 ? matches[0].store_id : null;
};

export const runCheckoutOwnershipBackfill = async (
  container: MedusaContainer,
  options: BackfillOptions = {},
): Promise<CheckoutBackfillReport> => {
  const apply = options.apply === true;

  if (apply) {
    assertBackfillApplySafety();
  }

  const report: CheckoutBackfillReport = {
    mode: apply ? "apply" : "dry-run",
    counts: emptyCounts(),
    conflicts: [],
  };
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any;
  const storeService = container.resolve(Modules.STORE) as any;
  const [
    carts,
    orders,
    cartLinks,
    orderLinks,
    productLinks,
    profileStoreLinks,
    stores,
  ] = await Promise.all([
    graphRecords(query, "cart"),
    graphRecords(query, "order"),
    listStoreCartLinks(container),
    listStoreOrderLinks(container),
    listStoreProductLinks(container),
    listStoreProfileStoreLinks(container),
    storeService.listStores({}, { take: 10000 }),
  ]);

  report.counts.carts_inspected = carts.length;
  report.counts.orders_inspected = orders.length;

  const recognizedStoreIds = new Set(
    profileStoreLinks.map((link) => link.store_id),
  );
  const channelOwners = new Map<string, string[]>();

  for (const store of stores) {
    if (
      recognizedStoreIds.has(store.id) &&
      typeof store.default_sales_channel_id === "string"
    ) {
      const owners = channelOwners.get(store.default_sales_channel_id) ?? [];
      owners.push(store.id);
      channelOwners.set(store.default_sales_channel_id, owners);
    }
  }

  const productOwners = new Map<string, string[]>();
  for (const link of productLinks) {
    const owners = productOwners.get(link.product_id) ?? [];
    owners.push(link.store_id);
    productOwners.set(link.product_id, owners);
  }

  const cartOwnerAfter = new Map<string, string>();

  const evaluate = async (
    kind: "cart" | "order",
    record: CoreRecord,
    ownershipLinks: Record<string, any>[],
  ): Promise<void> => {
    const idField = kind === "cart" ? "cart_id" : "order_id";
    const matchingLinks = ownershipLinks.filter(
      (link) => link[idField] === record.id,
    );

    if (matchingLinks.length > 1) {
      report.counts.ambiguous_ownership += 1;
      addConflict(report, kind, record.id, "multiple_store_links");
      return;
    }

    const existingOwner =
      matchingLinks.length === 1 ? matchingLinks[0].store_id : null;
    const candidateSets: string[][] = [];
    const channelMatches = record.sales_channel_id
      ? (channelOwners.get(record.sales_channel_id) ?? [])
      : [];

    if (channelMatches.length === 1) {
      candidateSets.push(channelMatches);
    } else if (channelMatches.length > 1) {
      report.counts.ambiguous_ownership += 1;
      addConflict(report, kind, record.id, "ambiguous_sales_channel");
      return;
    }

    const productIds = itemProductIds(record);
    const itemOwners: string[] = [];

    for (const productId of productIds) {
      const owners = productOwners.get(productId) ?? [];

      if (owners.length === 0) {
        report.counts.products_missing_ownership += 1;
        addConflict(report, kind, record.id, "product_missing_store");
        return;
      }

      if (owners.length > 1) {
        report.counts.ambiguous_ownership += 1;
        addConflict(report, kind, record.id, "product_multiple_stores");
        return;
      }

      itemOwners.push(owners[0]);
    }

    const distinctItemOwners = [...new Set(itemOwners)];

    if (distinctItemOwners.length > 1) {
      if (kind === "cart") {
        report.counts.mixed_store_carts += 1;
      } else {
        report.counts.mixed_store_orders += 1;
      }
      addConflict(report, kind, record.id, "mixed_store_items");
      return;
    }

    if (distinctItemOwners.length === 1) {
      candidateSets.push(distinctItemOwners);
    }

    const candidates = [...new Set(candidateSets.flat())];

    if (candidates.length > 1) {
      report.counts.channel_store_mismatches += 1;
      addConflict(report, kind, record.id, "channel_store_mismatch");
      return;
    }

    const candidate = candidates[0] ?? null;

    if (existingOwner) {
      if (candidate && existingOwner !== candidate) {
        report.counts.channel_store_mismatches += 1;
        addConflict(report, kind, record.id, "existing_store_mismatch");
        return;
      }

      if (kind === "cart") {
        report.counts.carts_already_owned += 1;
        cartOwnerAfter.set(record.id, existingOwner);
      } else {
        report.counts.orders_already_owned += 1;
      }
      return;
    }

    if (!candidate) {
      if (kind === "cart") {
        report.counts.unowned_carts += 1;
      } else {
        report.counts.unowned_orders += 1;
      }
      addConflict(report, kind, record.id, "insufficient_evidence");
      return;
    }

    if (apply) {
      if (kind === "cart") {
        await linkCartToStore(container, candidate, record.id);
      } else {
        await linkOrderToStore(container, candidate, record.id);
      }
    }

    if (kind === "cart") {
      report.counts.carts_linked += 1;
      cartOwnerAfter.set(record.id, candidate);
    } else {
      report.counts.orders_linked += 1;
    }
  };

  for (const cart of carts.sort((a, b) => a.id.localeCompare(b.id))) {
    await evaluate("cart", cart, cartLinks);
  }

  const orderCartRows = await query.graph({
    entity: "order_cart",
    fields: ["order_id", "cart_id"],
    pagination: { skip: 0, take: 10000 },
  } as any);
  const cartOwnerByOrder = new Map<string, string>();

  for (const relation of orderCartRows.data ?? []) {
    const owner = cartOwnerAfter.get(relation.cart_id);

    if (owner) {
      cartOwnerByOrder.set(relation.order_id, owner);
    }
  }

  for (const order of orders.sort((a, b) => a.id.localeCompare(b.id))) {
    const cartOwner = cartOwnerByOrder.get(order.id);

    if (cartOwner) {
      const synthetic = {
        ...order,
        items: [
          ...(order.items ?? []),
          { product_id: "__cart_owner_" + cartOwner },
        ],
      };
      productOwners.set("__cart_owner_" + cartOwner, [cartOwner]);
      await evaluate("order", synthetic, orderLinks);
    } else {
      await evaluate("order", order, orderLinks);
    }
  }

  const finalCartLinks = apply
    ? await listStoreCartLinks(container)
    : cartLinks;
  const finalOrderLinks = apply
    ? await listStoreOrderLinks(container)
    : orderLinks;

  if (apply) {
    for (const cart of carts) {
      const planned = cartOwnerAfter.get(cart.id);
      if (
        planned &&
        uniqueOwner(finalCartLinks, "cart_id", cart.id) !== planned
      ) {
        addConflict(report, "cart", cart.id, "reconciliation_failed");
      }
    }

    for (const order of orders) {
      const matches = finalOrderLinks.filter(
        (link) => link.order_id === order.id,
      );
      if (matches.length > 1) {
        addConflict(report, "order", order.id, "reconciliation_failed");
      }
    }
  }

  return report;
};
