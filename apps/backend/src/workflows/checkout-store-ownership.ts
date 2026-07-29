import {
  addShippingMethodToCartWorkflow,
  addToCartWorkflow,
  completeCartWorkflow,
  createCartWorkflow,
  createOrderWorkflow,
  listShippingOptionsForCartWithPricingWorkflow,
  listShippingOptionsForCartWorkflow,
  transferCartCustomerWorkflow,
  updateCartPromotionsWorkflow,
  updateCartWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/core-flows";
import { MedusaError } from "@medusajs/framework/utils";

import {
  assignDirectOrderOwnership,
  assignOrderFromCart,
  resolveCartStoreContext,
  validateCartStoreConfiguration,
} from "../api/_utils/cart-store-context";
import {
  linkCartToStore,
  resolveActiveStoreBySalesChannel,
} from "../api/_utils/checkout-ownership-links";
import {
  assertPromotionCodesAllowedForStore,
  assertRegionAllowedForStore,
  assertShippingOptionsAllowedForStore,
  validateCartItemsForStore,
  validateVariantsForStore,
} from "../api/_utils/checkout-store-policy";
import { assertStoreOnlineCheckoutReady } from "../api/_utils/store-commerce-readiness";

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message);

const inputCartId = (input: Record<string, any>): string => {
  const value = input.cart_id ?? input.id;
  if (typeof value !== "string" || !value) {
    throw invalid("The Cart ID is required.");
  }
  return value;
};

export const validateCreateCartStore = createCartWorkflow.hooks.validate(
  async ({ input, cart }, { container }) => {
    if ((input as any).promo_codes?.length) {
      throw invalid("Create the Cart before applying Store promotions.");
    }

    if (!cart.sales_channel_id) {
      throw invalid("A Cart must identify one Store sales channel.");
    }

    const binding = await resolveActiveStoreBySalesChannel(
      container,
      cart.sales_channel_id,
    );

    await assertStoreOnlineCheckoutReady(
      container,
      binding.storeProfile.id,
      binding.medusaStore.id,
      { validateGraph: true },
    );

    if (!cart.region_id) {
      throw invalid("A Cart must identify one Store-compatible region.");
    }

    await assertRegionAllowedForStore(
      container,
      binding.medusaStore.id,
      cart.region_id,
      cart.currency_code,
    );
    await validateCartItemsForStore(
      container,
      cart as Record<string, any>,
      binding.medusaStore.id,
      cart.sales_channel_id,
    );
  },
);

export const assignCreatedCartStore = createCartWorkflow.hooks.cartCreated(
  async ({ cart }, { container }) => {
    if (!cart.sales_channel_id) {
      throw invalid("A Cart must identify one Store sales channel.");
    }

    const binding = await resolveActiveStoreBySalesChannel(
      container,
      cart.sales_channel_id,
    );
    await linkCartToStore(container, binding.medusaStore.id, cart.id);
  },
);

export const validateUpdateCartStore = updateCartWorkflow.hooks.validate(
  async ({ input }, { container }) => {
    const context = await resolveCartStoreContext(container, input.id);

    await assertStoreOnlineCheckoutReady(
      container,
      context.storeProfileId,
      context.medusaStoreId,
      { validateGraph: true },
    );

    if (
      input.sales_channel_id &&
      input.sales_channel_id !== context.salesChannelId
    ) {
      throw invalid("Cart sales-channel ownership is immutable.");
    }

    if (input.region_id) {
      await assertRegionAllowedForStore(
        container,
        context.medusaStoreId,
        input.region_id,
        input.currency_code,
      );
    }

    await validateCartStoreConfiguration(container, context);
  },
);

export const validateAddedCartItems = addToCartWorkflow.hooks.validate(
  async ({ input }, { container }) => {
    const context = await resolveCartStoreContext(container, input.cart_id);

    await assertStoreOnlineCheckoutReady(
      container,
      context.storeProfileId,
      context.medusaStoreId,
      { validateGraph: true },
    );
    const variantIds = (input.items ?? [])
      .map((item) => item.variant_id)
      .filter((id): id is string => Boolean(id));

    if (variantIds.length !== (input.items ?? []).length) {
      throw invalid("Every Cart item must identify a product variant.");
    }

    await validateVariantsForStore(
      container,
      context.medusaStoreId,
      context.salesChannelId,
      variantIds,
    );
  },
);

export const validateUpdatedCartItem =
  updateLineItemInCartWorkflow.hooks.validate(
    async ({ input }, { container }) => {
      const context = await resolveCartStoreContext(
        container,
        inputCartId(input as Record<string, any>),
      );
      await assertStoreOnlineCheckoutReady(
        container,
        context.storeProfileId,
        context.medusaStoreId,
        { validateGraph: true },
      );
      await validateCartStoreConfiguration(container, context);
    },
  );

export const validateCartShippingMethod =
  addShippingMethodToCartWorkflow.hooks.validate(
    async ({ input }, { container }) => {
      const context = await resolveCartStoreContext(container, input.cart_id);
      await assertStoreOnlineCheckoutReady(
        container,
        context.storeProfileId,
        context.medusaStoreId,
        { validateGraph: true },
      );
      await assertShippingOptionsAllowedForStore(
        container,
        context.medusaStoreId,
        input.options.map((option) => option.id),
      );
    },
  );

const validateShippingOptionListing = async (
  cart: Record<string, any>,
  container: any,
): Promise<void> => {
  const context = await resolveCartStoreContext(container, cart.id);
  await assertStoreOnlineCheckoutReady(
    container,
    context.storeProfileId,
    context.medusaStoreId,
    { validateGraph: true },
  );
};

export const validateListedCartShippingOptions =
  listShippingOptionsForCartWorkflow.hooks.setShippingOptionsContext(
    async ({ cart }, { container }) => {
      await validateShippingOptionListing(cart as Record<string, any>, container);
      return undefined;
    },
  );

export const validateListedCartShippingOptionsWithPricing =
  listShippingOptionsForCartWithPricingWorkflow.hooks.setShippingOptionsContext(
    async ({ cart }, { container }) => {
      await validateShippingOptionListing(cart as Record<string, any>, container);
      return undefined;
    },
  );

export const validateCartPromotions =
  updateCartPromotionsWorkflow.hooks.validate(
    async ({ input }, { container }) => {
      if (!input.promo_codes?.length) {
        return;
      }

      const cartId = inputCartId(input as Record<string, any>);
      const context = await resolveCartStoreContext(container, cartId);
      await assertStoreOnlineCheckoutReady(
        container,
        context.storeProfileId,
        context.medusaStoreId,
        { validateGraph: true },
      );

      await assertPromotionCodesAllowedForStore(
        container,
        context.medusaStoreId,
        input.promo_codes ?? [],
      );
    },
  );

export const validateCartCustomerTransfer =
  transferCartCustomerWorkflow.hooks.validate(
    async ({ input }, { container }) => {
      const context = await resolveCartStoreContext(
        container,
        inputCartId(input as Record<string, any>),
      );
      await assertStoreOnlineCheckoutReady(
        container,
        context.storeProfileId,
        context.medusaStoreId,
        { validateGraph: true },
      );
      await validateCartStoreConfiguration(container, context);
    },
  );

export const validateCompleteCartStore = completeCartWorkflow.hooks.validate(
  async ({ input }, { container }) => {
    const context = await resolveCartStoreContext(container, input.id);
    await assertStoreOnlineCheckoutReady(
      container,
      context.storeProfileId,
      context.medusaStoreId,
      { validateGraph: true },
    );
    await validateCartStoreConfiguration(container, context);
  },
);

export const assignCompletedOrderStore = (
  completeCartWorkflow as any
).hooks.orderCreated(
  async (
    { order_id, cart_id }: { order_id: string; cart_id: string },
    { container }: { container: any },
  ) => {
    await assignOrderFromCart(container, cart_id, order_id);
  },
);

export const assignCreatedOrderStore = createOrderWorkflow.hooks.orderCreated(
  async ({ order }, { container }) => {
    await assignDirectOrderOwnership(container, order);
  },
);
