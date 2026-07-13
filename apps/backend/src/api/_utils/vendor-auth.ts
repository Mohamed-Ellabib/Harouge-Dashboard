import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto"
import { promisify } from "util"
import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

const PASSWORD_HASH_PREFIX = "scrypt"
const PASSWORD_KEY_LENGTH = 64
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
export const MAX_VENDOR_PASSWORD_LENGTH = 1024

const scryptAsync = promisify(scrypt)

export const VENDOR_SESSION_COOKIE = "vendor_session"

type VendorSessionPayload = {
  member_id: string
  vendor_id: string
  session_version: number
  exp: number
}

const base64UrlEncode = (value: Buffer | string): string => {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8")

  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

const base64UrlDecode = (value: string): Buffer => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)

  return Buffer.from(`${base64}${padding}`, "base64")
}

const safeEqual = (left: Buffer, right: Buffer): boolean => {
  return left.length === right.length && timingSafeEqual(left, right)
}

const getVendorSessionSecret = (): string => {
  const secret =
    process.env.VENDOR_SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.COOKIE_SECRET

  if (secret) {
    return secret
  }

  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "VENDOR_SESSION_SECRET, JWT_SECRET, or COOKIE_SECRET must be set in production."
    )
  }

  return "development-vendor-session-secret"
}

const sign = (value: string): string => {
  return base64UrlEncode(
    createHmac("sha256", getVendorSessionSecret()).update(value).digest()
  )
}

export const normalizeVendorPassword = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") {
    return null
  }

  if (typeof value !== "string") {
    return null
  }

  return value.length >= 8 && value.length <= MAX_VENDOR_PASSWORD_LENGTH
    ? value
    : null
}

export const hashVendorPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16)
  const hash = (await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH
  )) as Buffer

  return [
    PASSWORD_HASH_PREFIX,
    base64UrlEncode(salt),
    base64UrlEncode(hash),
  ].join("$")
}

export const verifyVendorPassword = (
  password: string,
  storedHash: unknown
): Promise<boolean> => {
  return verifyVendorPasswordHash(password, storedHash)
}

const verifyVendorPasswordHash = async (
  password: string,
  storedHash: unknown
): Promise<boolean> => {
  if (!password || password.length > MAX_VENDOR_PASSWORD_LENGTH) {
    return false
  }

  if (typeof storedHash !== "string") {
    return false
  }

  const [prefix, salt, expectedHash] = storedHash.split("$")

  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !expectedHash) {
    return false
  }

  try {
    const saltBuffer = base64UrlDecode(salt)
    const expected = base64UrlDecode(expectedHash)
    const actual = (await scryptAsync(
      password,
      saltBuffer,
      expected.length
    )) as Buffer

    return safeEqual(actual, expected)
  } catch {
    return false
  }
}

export const getVendorSessionVersion = (metadata: unknown): number => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0
  }

  const value = (metadata as Record<string, unknown>).session_version

  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0
}

export const nextVendorSessionVersion = (metadata: unknown): number => {
  return getVendorSessionVersion(metadata) + 1
}

export const getVendorPasswordHash = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  const passwordHash = (metadata as Record<string, unknown>).password_hash

  return typeof passwordHash === "string" ? passwordHash : null
}

export const createVendorSessionToken = (input: {
  member_id: string
  vendor_id: string
  session_version: number
}): { token: string; expiresAt: Date } => {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  const payload = base64UrlEncode(
    JSON.stringify({
      ...input,
      exp: Math.floor(expiresAt.getTime() / 1000),
    } satisfies VendorSessionPayload)
  )
  const signature = sign(payload)

  return {
    token: `${payload}.${signature}`,
    expiresAt,
  }
}

export const verifyVendorSessionToken = (
  token: unknown
): VendorSessionPayload | null => {
  if (typeof token !== "string") {
    return null
  }

  const [payload, signature] = token.split(".")

  if (!payload || !signature || !safeEqual(Buffer.from(sign(payload)), Buffer.from(signature))) {
    return null
  }

  try {
    const parsed = JSON.parse(
      base64UrlDecode(payload).toString("utf8")
    ) as Partial<VendorSessionPayload>

    if (
      typeof parsed.member_id !== "string" ||
      typeof parsed.vendor_id !== "string" ||
      typeof parsed.session_version !== "number" ||
      !Number.isSafeInteger(parsed.session_version) ||
      parsed.session_version < 0 ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return parsed as VendorSessionPayload
  } catch {
    return null
  }
}

const readCookie = (req: any, name: string): string | null => {
  const header = req.headers?.cookie

  if (typeof header !== "string") {
    return null
  }

  const match = header
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

export const setVendorSessionCookie = (
  res: MedusaResponse,
  token: string,
  expiresAt: Date
) => {
  ;(res as any).cookie(VENDOR_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

export const clearVendorSessionCookie = (res: MedusaResponse) => {
  ;(res as any).clearCookie(VENDOR_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

export const authenticateVendorSession = (req: any, res: any, next: any) => {
  const path = String(req.originalUrl ?? req.url ?? "").split("?")[0]

  if (
    path.startsWith("/vendor/auth/login") ||
    path.startsWith("/vendor/auth/logout")
  ) {
    return next()
  }

  const payload = verifyVendorSessionToken(readCookie(req, VENDOR_SESSION_COOKIE))

  if (!payload) {
    return res.status(401).json({
      message: "Vendor login is required.",
    })
  }

  req.vendor_auth = payload

  return next()
}
