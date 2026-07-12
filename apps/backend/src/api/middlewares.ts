import { authenticate, defineMiddlewares } from "@medusajs/framework/http"

import { authenticateVendorSession } from "./_utils/vendor-auth"

const parseCorsOrigins = (value?: string): string[] => {
  return value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : []
}

const vendorCors = (req, res, next) => {
  const origin = req.headers.origin
  const allowedOrigins = [
    ...parseCorsOrigins(process.env.AUTH_CORS),
    ...parseCorsOrigins(process.env.ADMIN_CORS),
  ]

  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes("*"))) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    )
    res.setHeader("Vary", "Origin")
  }

  res.setHeader("Cache-Control", "no-store")

  if (req.method === "OPTIONS") {
    return res.status(204).end()
  }

  return next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/vendors*",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/vendor*",
      middlewares: [vendorCors, authenticateVendorSession],
    },
  ],
})
