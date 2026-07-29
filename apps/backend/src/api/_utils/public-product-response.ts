import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

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

  const sanitized: Record<string, unknown> = {}
  seen.set(value, sanitized)

  for (const [key, entry] of Object.entries(value)) {
    if (key === "metadata") {
      continue
    }

    sanitized[key] = sanitizeProductValue(entry, seen)
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
