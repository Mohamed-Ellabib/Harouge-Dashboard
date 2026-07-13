import type { MedusaRequest } from "@medusajs/framework/http";
import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";

import {
  listStoreProfileStoreLinks,
  resolvePermanentStoreByProfileId,
  type PermanentStoreBinding,
} from "./legacy-vendor-compatibility";

type Scope = Pick<MedusaContainer, "resolve">;
export type CheckoutScopeInput = MedusaRequest | Scope;
type LinkRecord = Record<string, any>;

export const checkoutScopeFor = (input: CheckoutScopeInput): Scope =>
  "scope" in input ? input.scope : input;

const configurationError = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message);

const ownershipConflict = (message: string) =>
  new MedusaError(MedusaError.Types.CONFLICT, message);

const getOwnershipLinkModule = (
  input: CheckoutScopeInput,
  rightModule: string,
  rightField: string,
): any => {
  const link = checkoutScopeFor(input).resolve(
    ContainerRegistrationKeys.LINK,
  ) as any;
  const linkModule = link.getLinkModule(
    Modules.STORE,
    "store_id",
    rightModule,
    rightField,
  );

  if (!linkModule) {
    throw configurationError(
      `The Store-${rightModule} ownership link is unavailable.`,
    );
  }

  return linkModule;
};

export const storeCartLinkDefinition = (storeId: string, cartId: string) => ({
  [Modules.STORE]: { store_id: storeId },
  [Modules.CART]: { cart_id: cartId },
  data: { ownership_key: cartId },
});

export const storeOrderLinkDefinition = (storeId: string, orderId: string) => ({
  [Modules.STORE]: { store_id: storeId },
  [Modules.ORDER]: { order_id: orderId },
  data: { ownership_key: orderId },
});

export const listStoreCartLinks = async (
  input: CheckoutScopeInput,
  filters: Record<string, unknown> = {},
): Promise<LinkRecord[]> =>
  await getOwnershipLinkModule(input, Modules.CART, "cart_id").list(filters);

export const listStoreOrderLinks = async (
  input: CheckoutScopeInput,
  filters: Record<string, unknown> = {},
): Promise<LinkRecord[]> =>
  await getOwnershipLinkModule(input, Modules.ORDER, "order_id").list(filters);

export const linkCartToStore = async (
  input: CheckoutScopeInput,
  storeId: string,
  cartId: string,
): Promise<void> => {
  let existing = await listStoreCartLinks(input, { cart_id: cartId });

  if (!existing.length) {
    const link = checkoutScopeFor(input).resolve(
      ContainerRegistrationKeys.LINK,
    ) as any;

    await link
      .create(storeCartLinkDefinition(storeId, cartId))
      .catch(() => undefined);
    existing = await listStoreCartLinks(input, { cart_id: cartId });
  }

  if (existing.length !== 1 || existing[0].store_id !== storeId) {
    throw ownershipConflict(
      "A Cart cannot have missing, ambiguous, or reassigned Store ownership.",
    );
  }
};

export const linkOrderToStore = async (
  input: CheckoutScopeInput,
  storeId: string,
  orderId: string,
): Promise<void> => {
  let existing = await listStoreOrderLinks(input, { order_id: orderId });

  if (!existing.length) {
    const link = checkoutScopeFor(input).resolve(
      ContainerRegistrationKeys.LINK,
    ) as any;

    await link
      .create(storeOrderLinkDefinition(storeId, orderId))
      .catch(() => undefined);
    existing = await listStoreOrderLinks(input, { order_id: orderId });
  }

  if (existing.length !== 1 || existing[0].store_id !== storeId) {
    throw ownershipConflict(
      "An Order cannot have missing, ambiguous, or reassigned Store ownership.",
    );
  }
};

export const resolveActiveStoreById = async (
  input: CheckoutScopeInput,
  storeId: string,
): Promise<PermanentStoreBinding> => {
  const links = await listStoreProfileStoreLinks(input, { store_id: storeId });

  if (links.length !== 1) {
    throw configurationError(
      "The Medusa Store has a missing or ambiguous StoreProfile.",
    );
  }

  const binding = await resolvePermanentStoreByProfileId(
    input,
    links[0].store_profile_id,
  );

  if (binding.medusaStore.id !== storeId) {
    throw configurationError(
      "The StoreProfile mapping does not match the Medusa Store.",
    );
  }

  return binding;
};

export const resolveActiveStoreBySalesChannel = async (
  input: CheckoutScopeInput,
  salesChannelId: string,
): Promise<PermanentStoreBinding> => {
  const profileLinks = await listStoreProfileStoreLinks(input);
  const storeService = checkoutScopeFor(input).resolve(Modules.STORE) as any;
  const matches: string[] = [];

  for (const link of profileLinks) {
    const store = await storeService
      .retrieveStore(link.store_id)
      .catch(() => null);

    if (store?.default_sales_channel_id === salesChannelId) {
      matches.push(link.store_id);
    }
  }

  if (matches.length !== 1) {
    throw configurationError(
      "The sales channel does not identify exactly one Store.",
    );
  }

  return await resolveActiveStoreById(input, matches[0]);
};

export const exclusivelyOwnedIds = (
  links: LinkRecord[],
  ownerField: "cart_id" | "order_id",
  storeId: string,
): string[] => {
  const grouped = new Map<string, LinkRecord[]>();

  for (const link of links) {
    const id = link[ownerField];
    if (typeof id !== "string") {
      continue;
    }

    const records = grouped.get(id) ?? [];
    records.push(link);
    grouped.set(id, records);
  }

  return [...grouped.entries()]
    .filter(
      ([, records]) => records.length === 1 && records[0].store_id === storeId,
    )
    .map(([id]) => id);
};
