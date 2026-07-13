import { randomUUID } from "crypto";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";

import { getSaasService } from "./legacy-vendor-compatibility";
import type { PublicStoreContext } from "./public-store-context";
import {
  checkoutScopeFor,
  linkOrderToStore,
  listStoreCartLinks,
  listStoreOrderLinks,
  resolveActiveStoreById,
  resolveActiveStoreBySalesChannel,
  type CheckoutScopeInput,
} from "./checkout-ownership-links";
import {
  assertPromotionCodesAllowedForStore,
  assertRegionAllowedForStore,
  assertShippingOptionsAllowedForStore,
  validateCartItemsForStore,
  validateVariantsForStore,
} from "./checkout-store-policy";

export type CartStoreContext = {
  cartId: string;
  medusaStoreId: string;
  storeProfileId: string;
  tenantId: string;
  salesChannelId: string;
  publishableApiKeyId: string | null;
  regionId: string | null;
  currencyCode: string | null;
  cartStatus: "open" | "completed";
  requestId: string;
  cart: Record<string, any>;
};

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message);

const conflict = (message: string) =>
  new MedusaError(MedusaError.Types.CONFLICT, message);

const cartNotFound = () =>
  new MedusaError(MedusaError.Types.NOT_FOUND, "Cart was not found.");

const graphOne = async (
  input: CheckoutScopeInput,
  entity: string,
  fields: string[],
  filters: Record<string, unknown>,
): Promise<Record<string, any> | null> => {
  const query = checkoutScopeFor(input).resolve(
    ContainerRegistrationKeys.QUERY,
  ) as any;
  const { data = [] } = await query.graph({
    entity,
    fields,
    filters,
    pagination: { skip: 0, take: 2 },
  } as any);

  return data.length === 1 ? data[0] : null;
};

export const getCartRecord = async (
  input: CheckoutScopeInput,
  cartId: string,
): Promise<Record<string, any> | null> =>
  await graphOne(
    input,
    "cart",
    [
      "id",
      "sales_channel_id",
      "region_id",
      "currency_code",
      "completed_at",
      "customer_id",
      "customer.has_account",
      "metadata",
      "items.id",
      "items.variant_id",
      "items.product_id",
      "items.variant.product_id",
      "shipping_methods.shipping_option_id",
      "promotions.code",
    ],
    { id: cartId },
  );

export const getOrderRecord = async (
  input: CheckoutScopeInput,
  orderId: string,
): Promise<Record<string, any> | null> =>
  await graphOne(
    input,
    "order",
    [
      "id",
      "sales_channel_id",
      "region_id",
      "currency_code",
      "is_draft_order",
      "items.id",
      "items.variant_id",
      "items.product_id",
      "items.variant.product_id",
    ],
    { id: orderId },
  );

export const resolveCartStoreContext = async (
  input: CheckoutScopeInput,
  cartId: string,
  publishableApiKeyId: string | null = null,
): Promise<CartStoreContext> => {
  const [cart, links] = await Promise.all([
    getCartRecord(input, cartId),
    listStoreCartLinks(input, { cart_id: cartId }),
  ]);

  if (!cart || links.length !== 1) {
    throw cartNotFound();
  }

  const binding = await resolveActiveStoreById(input, links[0].store_id);
  const salesChannelId = binding.medusaStore.default_sales_channel_id;
  const boundPublishableApiKeyId =
    typeof cart.metadata?.saas_publishable_api_key_id === "string"
      ? cart.metadata.saas_publishable_api_key_id
      : null;

  if (publishableApiKeyId && boundPublishableApiKeyId !== publishableApiKeyId) {
    throw cartNotFound();
  }

  if (!salesChannelId || cart.sales_channel_id !== salesChannelId) {
    throw invalid("The Cart sales channel and canonical Store disagree.");
  }

  return {
    cartId,
    medusaStoreId: binding.medusaStore.id,
    storeProfileId: binding.storeProfile.id,
    tenantId: binding.tenant.id,
    salesChannelId,
    publishableApiKeyId: boundPublishableApiKeyId,
    regionId: cart.region_id ?? null,
    currencyCode: cart.currency_code ?? null,
    cartStatus: cart.completed_at ? "completed" : "open",
    requestId: randomUUID(),
    cart,
  };
};

export const assertPublicCartContext = (
  cartContext: CartStoreContext,
  publicContext: PublicStoreContext,
): void => {
  if (
    cartContext.medusaStoreId !== publicContext.medusaStoreId ||
    cartContext.storeProfileId !== publicContext.storeProfileId ||
    cartContext.tenantId !== publicContext.tenantId ||
    cartContext.salesChannelId !== publicContext.salesChannelId ||
    cartContext.publishableApiKeyId !== publicContext.publishableApiKeyId
  ) {
    throw cartNotFound();
  }
};

export const validateCartStoreConfiguration = async (
  input: CheckoutScopeInput,
  context: CartStoreContext,
): Promise<void> => {
  if (!context.regionId) {
    throw invalid("The Cart must have a Store-compatible region.");
  }

  await assertRegionAllowedForStore(
    input,
    context.medusaStoreId,
    context.regionId,
    context.currencyCode,
  );
  await validateCartItemsForStore(
    input,
    context.cart,
    context.medusaStoreId,
    context.salesChannelId,
  );

  const shippingIds = (context.cart.shipping_methods ?? [])
    .map((method: any) => method.shipping_option_id)
    .filter(Boolean);

  if (shippingIds.length) {
    await assertShippingOptionsAllowedForStore(
      input,
      context.medusaStoreId,
      shippingIds,
    );
  }

  await assertPromotionCodesAllowedForStore(
    input,
    context.medusaStoreId,
    (context.cart.promotions ?? [])
      .map((promotion: any) => promotion.code)
      .filter(Boolean),
  );
};

export const getOrderIdForCart = async (
  input: CheckoutScopeInput,
  cartId: string,
): Promise<string | null> => {
  const relation = await graphOne(
    input,
    "order_cart",
    ["cart_id", "order_id"],
    { cart_id: cartId },
  );

  return relation?.order_id ?? null;
};

export const validateCartForCompletion = async (
  input: CheckoutScopeInput,
  cartId: string,
): Promise<CartStoreContext> => {
  const context = await resolveCartStoreContext(input, cartId);
  await validateCartStoreConfiguration(input, context);

  const orderId = await getOrderIdForCart(input, cartId);

  if (context.cartStatus === "completed" && !orderId) {
    throw conflict("The completed Cart has no recoverable Order ownership.");
  }

  if (orderId) {
    const orderLinks = await listStoreOrderLinks(input, {
      order_id: orderId,
    });

    if (
      orderLinks.length !== 1 ||
      orderLinks[0].store_id !== context.medusaStoreId
    ) {
      throw conflict(
        "The existing Order ownership does not match the Cart Store.",
      );
    }
  }

  return context;
};

const recordOwnershipRepair = async (
  input: CheckoutScopeInput,
  data: Record<string, unknown>,
): Promise<void> => {
  const saas = getSaasService(input) as any;
  await saas.createCheckoutOwnershipRepairs(data);
};

export const assignOrderFromCart = async (
  input: CheckoutScopeInput,
  cartId: string,
  orderId: string,
): Promise<void> => {
  const context = await resolveCartStoreContext(input, cartId);
  await validateCartStoreConfiguration(input, context);
  const linkedOrderId = await getOrderIdForCart(input, cartId);

  if (linkedOrderId && linkedOrderId !== orderId) {
    throw conflict("The Cart is already linked to a different Order.");
  }

  const existingLinks = await listStoreOrderLinks(input, {
    order_id: orderId,
  });

  if (
    existingLinks.length > 1 ||
    (existingLinks.length === 1 &&
      existingLinks[0].store_id !== context.medusaStoreId)
  ) {
    throw conflict("The Order ownership conflicts with the Cart Store.");
  }

  try {
    if (
      process.env.NODE_ENV === "test" &&
      process.env.SAAS_TEST_FAIL_ORDER_LINK_CART_ID === cartId
    ) {
      throw conflict("Simulated Order Store-link failure.");
    }

    await linkOrderToStore(input, context.medusaStoreId, orderId);
    const links = await listStoreOrderLinks(input, { order_id: orderId });

    if (links.length !== 1 || links[0].store_id !== context.medusaStoreId) {
      throw conflict("The Order Store link could not be verified.");
    }
  } catch (error) {
    await recordOwnershipRepair(input, {
      kind: "order",
      cart_id: cartId,
      order_id: orderId,
      store_id: context.medusaStoreId,
      status: "pending",
      reason: "order_store_link_failed",
      details: {
        message: error instanceof Error ? error.message : "unknown",
      },
    }).catch(() => undefined);

    throw error;
  }
};

export const assignDirectOrderOwnership = async (
  input: CheckoutScopeInput,
  order: Record<string, any>,
): Promise<void> => {
  const record = (await getOrderRecord(input, order.id)) ?? order;
  const salesChannelId = record.sales_channel_id;

  if (!salesChannelId) {
    throw invalid("An Order must identify one Store sales channel.");
  }

  const binding = await resolveActiveStoreBySalesChannel(input, salesChannelId);
  const items = Array.isArray(record.items) ? record.items : [];
  const variantIds = items.map((item: any) => item.variant_id).filter(Boolean);

  if (!items.length || variantIds.length !== items.length) {
    throw invalid(
      "Every commercial Order item must identify a product variant.",
    );
  }

  await validateVariantsForStore(
    input,
    binding.medusaStore.id,
    salesChannelId,
    variantIds,
  );

  await linkOrderToStore(input, binding.medusaStore.id, order.id);
};

export const getCartIdForPaymentCollection = async (
  input: CheckoutScopeInput,
  paymentCollectionId: string,
): Promise<string | null> => {
  const relation = await graphOne(
    input,
    "cart_payment_collection",
    ["cart_id", "payment_collection_id"],
    { payment_collection_id: paymentCollectionId },
  );

  return relation?.cart_id ?? null;
};
