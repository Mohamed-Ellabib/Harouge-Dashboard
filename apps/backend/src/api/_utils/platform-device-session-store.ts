import { createHash, createHmac } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const DEVICE_COOKIE = "labibtech.platform-device"
export const DEVICE_MAX_AGE = 30 * 24 * 60 * 60 * 1000
export const deviceDatabase = (scope: MedusaContainer): any => scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
export const hashDeviceToken = (token: string) => createHash("sha256").update(token).digest("hex")

// Bind remembered access to the current login credential without copying its
// password hash. Password reset, removed identity and changed ownership revoke it.
export async function deviceCredentialFingerprint(scope: MedusaContainer, identityId: string, userId: string): Promise<string | null> {
  const db = deviceDatabase(scope)
  const identity = await db("auth_identity").where({ id: identityId }).whereNull("deleted_at").first()
  if (identity?.app_metadata?.user_id !== userId) return null
  const provider = await db("provider_identity").where({ auth_identity_id: identityId, provider: "emailpass" }).whereNull("deleted_at").first()
  const passwordHash = provider?.provider_metadata?.password
  if (typeof passwordHash !== "string" || !passwordHash) return null
  const config: any = scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const secret = config.projectConfig.http.cookieSecret
  if (typeof secret !== "string" || !secret) throw new Error("Session configuration unavailable.")
  return createHmac("sha256", secret).update(JSON.stringify([identityId, userId, passwordHash])).digest("hex")
}

export async function readValidDeviceSession(scope: MedusaContainer, hash: string, userId?: string) {
  if (!/^[a-f0-9]{64}$/.test(hash)) return null
  const db = deviceDatabase(scope)
  const row = await db("platform_device_session").where({ token_hash: hash }).where("expires_at", ">", db.fn.now()).first()
  if (!row || (userId && row.user_id !== userId)) return null
  if (row.credential_fingerprint !== await deviceCredentialFingerprint(scope, row.auth_identity_id, row.user_id)) {
    await db("platform_device_session").where({ token_hash: hash }).delete()
    return null
  }
  return row
}
