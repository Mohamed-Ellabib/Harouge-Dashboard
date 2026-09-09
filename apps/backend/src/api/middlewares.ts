import { authenticate, defineMiddlewares } from "@medusajs/framework/http";

import { authenticateVendorSession } from "./_utils/vendor-auth";

import { attachMerchantStoreContext } from "./_utils/merchant-store-context";
import { requirePlatformSuperAdmin } from "./_utils/platform-super-admin";
import { requireDeviceSessionOrigin, revokePlatformDevice } from "./auth/platform-session/route";
import { protectPublicCartStore } from "./_utils/public-cart-store";
import { enforcePublicProductResponseBoundary } from "./_utils/public-product-response";
import { attachPublicStoreContext } from "./_utils/public-store-context";
const parseCorsOrigins = (value?: string): string[] => {
  return value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];
};

const vendorCors = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    ...parseCorsOrigins(process.env.AUTH_CORS),
    ...parseCorsOrigins(process.env.ADMIN_CORS),
  ];

  if (
    origin &&
    (allowedOrigins.includes(origin) || allowedOrigins.includes("*"))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return next();
};

export default defineMiddlewares({
  routes: [
    { matcher: "/auth/platform-session", middlewares: [requireDeviceSessionOrigin] },
    {
      matcher: "/auth/platform-session",
      method: ["POST"],
      middlewares: [authenticate("user", ["bearer"])],
    },
    {
      matcher: "/auth/session",
      method: ["DELETE"],
      middlewares: [async (req, res, next) => { await revokePlatformDevice(req as any, res); next(); }],
    },
    {
      matcher: "/store/products*",
      middlewares: [
        attachPublicStoreContext,
        enforcePublicProductResponseBoundary,
      ],
    },
    {
      matcher: "/store/saas*",
      middlewares: [attachPublicStoreContext],
    },
    {
      matcher: "/store/carts*",
      middlewares: [attachPublicStoreContext, protectPublicCartStore],
    },
    {
      matcher: "/store/payment-collections*",
      middlewares: [attachPublicStoreContext, protectPublicCartStore],
    },
    {
      matcher: "/store/shipping-options*",
      middlewares: [attachPublicStoreContext, protectPublicCartStore],
    },
    {
      method: ["POST"],
      matcher: "/admin/saas/uploads",
      bodyParser: { sizeLimit: "4mb" },
    },
    {
      method: ["PUT", "POST"],
      matcher: "/admin/saas/creation-drafts*",
      bodyParser: { sizeLimit: "256kb" },
      middlewares: [],
    },
    {
      matcher: "/admin/saas/stores/*/storefront/*",
      bodyParser: { sizeLimit: "96kb" },
    },
    {
      matcher: "/admin/saas*",
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        requirePlatformSuperAdmin,
      ],
    },
    {
      matcher: "/admin/vendors*",
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        requirePlatformSuperAdmin,
      ],
    },
    {
      method: ["POST"],
      matcher: "/vendor/uploads",
      bodyParser: { sizeLimit: "36mb" },
    },
    {
      matcher: "/vendor*",
      middlewares: [
        vendorCors,
        authenticateVendorSession,
        attachMerchantStoreContext,
      ],
    },
  ],
});
