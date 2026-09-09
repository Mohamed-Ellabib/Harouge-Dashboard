import { randomBytes } from "node:crypto"
import type { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { resolvePlatformSuperAdminActor } from "../../_utils/platform-super-admin"
import { DEVICE_COOKIE, DEVICE_MAX_AGE, deviceCredentialFingerprint, deviceDatabase, hashDeviceToken, readValidDeviceSession } from "../../_utils/platform-device-session-store"

const cookieOptions = () => ({ httpOnly: true, sameSite: "lax" as const, secure: ["production", "staging"].includes(process.env.NODE_ENV || ""), path: "/" })
const cookieHash = (req: AuthenticatedMedusaRequest) => {
  const token = req.cookies?.[DEVICE_COOKIE]
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token) ? hashDeviceToken(token) : null
}
const persist = (req: AuthenticatedMedusaRequest) => new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()))
const regenerate = (req: AuthenticatedMedusaRequest) => new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()))
const unauthorized = () => new MedusaError(MedusaError.Types.UNAUTHORIZED, "Please sign in again.")

export function requireDeviceSessionOrigin(req: MedusaRequest, _res: MedusaResponse, next: () => void) {
  const origin = req.headers.origin
  const config: any = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const allowed = `${config.projectConfig.http.authCors},${config.projectConfig.http.adminCors}`.split(",").map(value => value.trim())
  if (origin && !allowed.includes(origin)) throw new MedusaError(MedusaError.Types.FORBIDDEN, "Request origin is not allowed.")
  next()
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  if (!req.body || typeof (req.body as any).remember !== "boolean" || Object.keys(req.body).length !== 1) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Choose whether to remember this device.")
  }
  const actor = await resolvePlatformSuperAdminActor(req)
  const context = req.auth_context
  const db = deviceDatabase(req.scope)
  const oldHash = cookieHash(req)
  const remember = (req.body as any).remember
  const fingerprint = remember ? await deviceCredentialFingerprint(req.scope, context.auth_identity_id, actor.id) : null
  if (remember && !fingerprint) throw unauthorized()
  await regenerate(req)
  req.session.auth_context = context
  // The server session remains bounded; the separate cookie can restore it.
  if (!remember) req.session.cookie.expires = null as any
  let token: string | undefined
  await db.transaction(async (tx: any) => {
    if (oldHash) await tx("platform_device_session").where({ token_hash: oldHash }).delete()
    await tx("platform_device_session").where("expires_at", "<=", tx.fn.now()).delete()
    if (remember) {
      token = randomBytes(32).toString("base64url")
      const hash = hashDeviceToken(token)
      await tx("platform_device_session").insert({ token_hash: hash, user_id: actor.id, auth_identity_id: context.auth_identity_id,
        credential_fingerprint: fingerprint, expires_at: new Date(Date.now() + DEVICE_MAX_AGE) })
      ;(req.session as any).platform_device_hash = hash
    }
  })
  await persist(req)
  if (token) res.cookie(DEVICE_COOKIE, token, { ...cookieOptions(), maxAge: DEVICE_MAX_AGE })
  else res.clearCookie(DEVICE_COOKIE, cookieOptions())
  res.setHeader("Cache-Control", "no-store")
  res.json({ remembered: remember })
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  const hash = cookieHash(req)
  const row = hash && await readValidDeviceSession(req.scope, hash)
  if (!row) { res.clearCookie(DEVICE_COOKIE, cookieOptions()); throw unauthorized() }
  req.auth_context = { actor_id: row.user_id, actor_type: "user", auth_identity_id: row.auth_identity_id, app_metadata: { user_id: row.user_id }, user_metadata: {} }
  const actor = await resolvePlatformSuperAdminActor(req)
  await regenerate(req)
  req.session.auth_context = req.auth_context
  ;(req.session as any).platform_device_hash = hash
  req.session.cookie.maxAge = Math.min(10 * 60 * 60 * 1000, new Date(row.expires_at).getTime() - Date.now())
  await persist(req)
  res.json({ authorized: true, actor })
}

// Used by the regular Medusa logout route too, so neither logout can leave a
// remembered credential that silently signs the user back in.
export async function revokePlatformDevice(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const hashes = [cookieHash(req), (req.session as any)?.platform_device_hash].filter(Boolean)
  if (hashes.length) await deviceDatabase(req.scope)("platform_device_session").whereIn("token_hash", hashes).delete()
  res.clearCookie(DEVICE_COOKIE, cookieOptions())
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await revokePlatformDevice(req, res)
  const { projectConfig }: any = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  await new Promise<void>((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()))
  res.clearCookie(projectConfig.sessionOptions?.name ?? "connect.sid", projectConfig.cookieOptions)
  res.setHeader("Cache-Control", "no-store")
  res.json({ success: true })
}
