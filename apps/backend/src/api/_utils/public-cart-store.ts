import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import {
  assertPublicCartContext,
  getCartIdForPaymentCollection,
  resolveCartStoreContext,
  type CartStoreContext,
  validateCartForCompletion,
} from "./cart-store-context";
import {
  assertPromotionCodesAllowedForStore,
  assertRegionAllowedForStore,
  assertShippingOptionsAllowedForStore,
  selectRegionForStore,
  validateVariantsForStore,
} from "./checkout-store-policy";
import { getPublicStoreContext } from "./public-store-context";
import { assertStoreOnlineCheckoutReady } from "./store-commerce-readiness";
import { COMMERCE_GATE_PAYMENT_PROVIDER_ID } from "../../workflows/commerce-readiness-contract";

const CONTEXT_KEY = "cart_store_context";

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message);

const cartNotFound = () =>
  new MedusaError(MedusaError.Types.NOT_FOUND, "Cart was not found.");

const requestPath = (req: MedusaRequest): string =>
  String((req as any).originalUrl ?? (req as any).url ?? "")
    .split("?")[0]
    .replace(/\/+$/, "");

const requestBody = (req: MedusaRequest): Record<string, any> => {
  const value = (req as any).validatedBody ?? (req as any).body;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
};

const setBodyValue = (
  req: MedusaRequest,
  key: string,
  value: unknown,
): void => {
  if ((req as any).validatedBody) {
    (req as any).validatedBody[key] = value;
  }

  if ((req as any).body) {
    (req as any).body[key] = value;
  }
};

const cartIdFromRequest = async (
  req: MedusaRequest,
): Promise<string | null> => {
  const path = requestPath(req);
  const cartMatch = path.match(/^\/store\/carts\/([^/]+)/);

  if (cartMatch) {
    return decodeURIComponent(cartMatch[1]);
  }

  if (path === "/store/payment-collections") {
    const cartId = requestBody(req).cart_id ?? (req as any).body?.cart_id;
    return typeof cartId === "string" ? cartId : null;
  }

  const paymentMatch = path.match(
    /^\/store\/payment-collections\/([^/]+)\/payment-sessions$/,
  );

  if (paymentMatch) {
    return await getCartIdForPaymentCollection(
      req,
      decodeURIComponent(paymentMatch[1]),
    );
  }

  if (path === "/store/shipping-options") {
    const cartId =
      (req as any).filterableFields?.cart_id ?? (req as any).query?.cart_id;
    return typeof cartId === "string" ? cartId : null;
  }

  const calculateMatch = path.match(
    /^\/store\/shipping-options\/([^/]+)\/calculate$/,
  );

  if (calculateMatch) {
    const cartId = requestBody(req).cart_id;
    return typeof cartId === "string" ? cartId : null;
  }

  return null;
};

const prepareCreateCart = async (req: MedusaRequest): Promise<void> => {
  const publicContext = getPublicStoreContext(req);

  if (!publicContext) {
    throw invalid("A verified Store context is required to create a Cart.");
  }

  await assertStoreOnlineCheckoutReady(
    req,
    publicContext.storeProfileId,
    publicContext.medusaStoreId,
    { validateGraph: true },
  );

  const body = requestBody(req);
  const controlledFields = [
    "store_id",
    "medusa_store_id",
    "store_profile_id",
    "tenant_id",
    "publishable_api_key_id",
  ];

  if (controlledFields.some((field) => field in body)) {
    throw invalid("Cart Store ownership is controlled by the platform.");
  }

  const metadata =
    body.metadata &&
    typeof body.metadata === "object" &&
    !Array.isArray(body.metadata)
      ? body.metadata
      : {};

  if ("saas_publishable_api_key_id" in metadata) {
    throw invalid(
      "Cart publishable-key ownership is controlled by the platform.",
    );
  }

  if (
    body.sales_channel_id &&
    body.sales_channel_id !== publicContext.salesChannelId
  ) {
    throw invalid("The requested sales channel does not belong to this Store.");
  }

  const region = await selectRegionForStore(
    req,
    publicContext.medusaStoreId,
    body.region_id,
  );

  if (body.currency_code && body.currency_code !== region.currency_code) {
    throw invalid("The requested currency does not match the Store region.");
  }

  if (body.promo_codes?.length) {
    throw invalid("Create the Cart before applying Store promotions.");
  }

  const variantIds = (body.items ?? [])
    .map((item: any) => item.variant_id)
    .filter(Boolean);

  await validateVariantsForStore(
    req,
    publicContext.medusaStoreId,
    publicContext.salesChannelId,
    variantIds,
  );

  setBodyValue(req, "metadata", {
    ...metadata,
    saas_publishable_api_key_id: publicContext.publishableApiKeyId,
  });
  setBodyValue(req, "sales_channel_id", publicContext.salesChannelId);
  setBodyValue(req, "region_id", region.id);
  setBodyValue(req, "currency_code", region.currency_code);
};

const validateExistingCartRequest = async (
  req: MedusaRequest,
  context: CartStoreContext,
): Promise<void> => {
  const path = requestPath(req);
  const body = requestBody(req);
  const method = String((req as any).method ?? "GET").toUpperCase();
  const actorId = (req as any).auth_context?.actor_id;
  const requiresCheckoutReadiness =
    method !== "GET" ||
    path.startsWith("/store/shipping-options") ||
    path.startsWith("/store/payment-collections");

  if (requiresCheckoutReadiness) {
    await assertStoreOnlineCheckoutReady(
      req,
      context.storeProfileId,
      context.medusaStoreId,
      { validateGraph: true },
    );
  }

  if (
    context.cart.customer_id &&
    context.cart.customer?.has_account &&
    actorId !== context.cart.customer_id
  ) {
    throw cartNotFound();
  }

  if (
    method !== "GET" &&
    context.cartStatus === "completed" &&
    !path.endsWith("/complete")
  ) {
    throw invalid("A completed Cart cannot be mutated.");
  }

  if (
    body.sales_channel_id &&
    body.sales_channel_id !== context.salesChannelId
  ) {
    throw invalid("Cart sales-channel ownership is immutable.");
  }

  if (body.region_id) {
    const region = await assertRegionAllowedForStore(
      req,
      context.medusaStoreId,
      body.region_id,
    );

    if (body.currency_code && body.currency_code !== region.currency_code) {
      throw invalid("The requested currency does not match the Store region.");
    }
  }

  if (path.endsWith("/line-items") && method === "POST") {
    await validateVariantsForStore(
      req,
      context.medusaStoreId,
      context.salesChannelId,
      [body.variant_id],
    );
  }

  if (path.endsWith("/shipping-methods") && method === "POST") {
    const payload = Array.isArray((req as any).validatedBody)
      ? (req as any).validatedBody
      : [body];
    await assertShippingOptionsAllowedForStore(
      req,
      context.medusaStoreId,
      payload.map((entry: any) => entry.option_id),
    );
  }

  if (
    path.match(
      /^\/store\/payment-collections\/[^/]+\/payment-sessions$/,
    ) &&
    method === "POST" &&
    body.provider_id !== COMMERCE_GATE_PAYMENT_PROVIDER_ID
  ) {
    throw invalid("The payment provider is not available for this Store.");
  }

  if (path.endsWith("/promotions")) {
    await assertPromotionCodesAllowedForStore(
      req,
      context.medusaStoreId,
      body.promo_codes ?? [],
    );
  }

  const calculateMatch = path.match(
    /^\/store\/shipping-options\/([^/]+)\/calculate$/,
  );

  if (calculateMatch) {
    await assertShippingOptionsAllowedForStore(req, context.medusaStoreId, [
      decodeURIComponent(calculateMatch[1]),
    ]);
  }

  if (path.endsWith("/complete")) {
    await validateCartForCompletion(req, context.cartId);
  }
};

export const getCartStoreContext = (
  req: MedusaRequest,
): CartStoreContext | null => (req as any)[CONTEXT_KEY] ?? null;

export const protectPublicCartStore = async (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction,
) => {
  try {
    const path = requestPath(req);

    if (path === "/store/carts" && req.method === "POST") {
      await prepareCreateCart(req);
      return next();
    }

    const cartId = await cartIdFromRequest(req);

    if (!cartId) {
      if (
        path.startsWith("/store/carts/") ||
        path.startsWith("/store/payment-collections")
      ) {
        throw cartNotFound();
      }

      return next();
    }

    const publicContext = getPublicStoreContext(req);

    if (!publicContext) {
      throw cartNotFound();
    }

    const context = await resolveCartStoreContext(
      req,
      cartId,
      publicContext.publishableApiKeyId,
    );
    assertPublicCartContext(context, publicContext);
    await validateExistingCartRequest(req, context);
    (req as any)[CONTEXT_KEY] = context;

    return next();
  } catch (error) {
    return next(error);
  }
};
