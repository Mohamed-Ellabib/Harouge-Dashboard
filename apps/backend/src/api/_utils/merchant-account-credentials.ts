import { getVendorPasswordHash } from "./vendor-auth"
import { normalizeEmail } from "./vendors"

type RecordLike = Record<string, any>

const SCRYPT_CREDENTIAL_PATTERN =
  /^scrypt\$[A-Za-z0-9_-]{16,}\$[A-Za-z0-9_-]{32,}$/

export const hasValidNormalizedMerchantEmail = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return false
  }

  const normalized = normalizeEmail(value)
  return (
    value === normalized &&
    normalized.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  )
}

export const hasValidMerchantAccountCredential = (
  account: RecordLike | null | undefined,
): boolean => {
  if (!account || !hasValidNormalizedMerchantEmail(account.email)) {
    return false
  }

  const passwordHash = getVendorPasswordHash(account.metadata)
  return Boolean(
    passwordHash && SCRYPT_CREDENTIAL_PATTERN.test(passwordHash),
  )
}

export const hasActiveMerchantAccountCredential = (
  account: RecordLike | null | undefined,
): boolean =>
  account?.status === "active" && hasValidMerchantAccountCredential(account)
