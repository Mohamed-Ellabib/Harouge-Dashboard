import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const PUBLIC_PRODUCT_PRESENTATION_KEYS = new Set([
  "storefront_category",
  "storefront_badge",
  "storefront_compare_at_price_lyd",
])

const safePresentationText = (value: unknown, maximum: number) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= maximum &&
  !/[\u0000-\u001f\u007f<>]/u.test(value)
    ? value.trim()
    : null

const productPresentation = (value: Record<string, unknown>) => {
  if (
    typeof value.handle !== "string" ||
    typeof value.title !== "string" ||
    !value.metadata ||
    typeof value.metadata !== "object" ||
    Array.isArray(value.metadata)
  ) {
    return null
  }
  const metadata = value.metadata as Record<string, unknown>
  const category = safePresentationText(
    metadata.labibtech_storefront_category,
    80,
  )
  const badge = safePresentationText(
    metadata.labibtech_storefront_badge,
    40,
  )
  const compareAt = metadata.labibtech_storefront_compare_at_price_lyd
  return {
    category,
    badge,
    compareAt:
      typeof compareAt === "number" &&
      Number.isFinite(compareAt) &&
      compareAt >= 0 &&
      compareAt <= 1_000_000_000
        ? compareAt
        : null,
  }
}

const sanitizeProductValue = (
  value: unknown,
  seen: WeakMap<object, unknown>
): unknown => {
  if (!value || typeof value !== "object") {
    return value
  }

  if (value instanceof Date || Buffer.isBuffer(value)) {
    return value
  }

  const existing = seen.get(value)

  if (existing) {
    return existing
  }

  if (Array.isArray(value)) {
    const sanitized: unknown[] = []
    seen.set(value, sanitized)

    for (const entry of value) {
      sanitized.push(sanitizeProductValue(entry, seen))
    }

    return sanitized
  }

  const source = value as Record<string, unknown>
  const presentation = productPresentation(source)
  const sanitized: Record<string, unknown> = {}
  seen.set(value, sanitized)

  for (const [key, entry] of Object.entries(source)) {
    if (key === "metadata" || PUBLIC_PRODUCT_PRESENTATION_KEYS.has(key)) {
      continue
    }

    sanitized[key] = sanitizeProductValue(entry, seen)
  }

  if (presentation?.category) {
    sanitized.storefront_category = presentation.category
  }
  if (presentation?.badge) {
    sanitized.storefront_badge = presentation.badge
  }
  if (presentation?.compareAt !== null && presentation?.compareAt !== undefined) {
    sanitized.storefront_compare_at_price_lyd = presentation.compareAt
  }

  return sanitized
}

export const sanitizePublicProductResponse = (value: unknown): unknown =>
  sanitizeProductValue(value, new WeakMap())

export const enforcePublicProductResponseBoundary = (
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const sendJson = res.json.bind(res)

  res.json = ((body: unknown) =>
    sendJson(sanitizePublicProductResponse(body))) as typeof res.json

  return next()
}
