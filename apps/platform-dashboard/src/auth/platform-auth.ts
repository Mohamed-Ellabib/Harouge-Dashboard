import Medusa, { FetchError } from "@medusajs/js-sdk"
import { restorePlatformSession } from "./platform-session"

const configuredBackendUrl = import.meta.env.VITE_MEDUSA_BACKEND_URL?.trim()
const backendUrl = configuredBackendUrl
  ? configuredBackendUrl.replace(/\/+$/, "")
  : window.location.origin

const sdk = new Medusa({
  baseUrl: backendUrl,
  auth: {
    type: "session",
    fetchCredentials: "include",
  },
  debug: false,
})

const configuredAfterLoginUrl = import.meta.env.VITE_PLATFORM_ADMIN_AFTER_LOGIN_URL?.trim()
const platformAuthTimeoutMs = 12_000

export const platformAdminAfterLoginUrl =
  configuredAfterLoginUrl && configuredAfterLoginUrl !== "/app"
    ? configuredAfterLoginUrl
    : "/dashboard"

export const platformSupportEmail =
  import.meta.env.VITE_PLATFORM_SUPPORT_EMAIL?.trim() || "support@labibtech.ly"

export type PlatformAdmin = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
}

export class PlatformAuthStepRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PlatformAuthStepRequiredError"
  }
}

export class PlatformAuthTimeoutError extends Error {
  constructor() {
    super("The platform authentication service did not respond in time.")
    this.name = "PlatformAuthTimeoutError"
  }
}

export class PlatformAccessDeniedError extends Error {
  readonly status = 403

  constructor() {
    super("This account is not authorized to use the platform-owner dashboard.")
    this.name = "PlatformAccessDeniedError"
  }
}

class PlatformAccessRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Platform access verification failed (${status}).`)
    this.name = "PlatformAccessRequestError"
    this.status = status
  }
}

type PlatformLoginResponse = {
  location?: string
  mfa_challenge?: unknown
  token?: string
  verification?: unknown
  verification_required?: boolean
}

async function withPlatformAuthTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  let didTimeOut = false
  let timeoutId: number | undefined

  timeoutId = window.setTimeout(() => {
    didTimeOut = true
    controller.abort()
  }, platformAuthTimeoutMs)

  try {
    return await request(controller.signal)
  } catch (error) {
    if (didTimeOut) {
      throw new PlatformAuthTimeoutError()
    }

    throw error
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }
}

const isPlatformAdmin = (value: unknown): value is PlatformAdmin => {
  if (!value || typeof value !== "object") {
    return false
  }

  const actor = value as Partial<PlatformAdmin>
  return typeof actor.id === "string" && Boolean(actor.id) && typeof actor.email === "string"
}

async function createPlatformSession(token: string, signal: AbortSignal): Promise<void> {
  await sdk.client.fetch("/auth/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
}

async function loginPlatformSession(
  email: string,
  password: string,
  signal: AbortSignal,
) {
  const {
    token,
    location,
    mfa_challenge: mfaChallenge,
    verification_required: verificationRequired,
    verification,
  } = await sdk.client.fetch<PlatformLoginResponse>("/auth/user/emailpass", {
    method: "POST",
    body: { email, password },
    signal,
  })

  if (location) {
    return { location }
  }

  if (!token) {
    throw new Error("Unexpected authentication response")
  }

  await createPlatformSession(token, signal)

  if (verificationRequired) {
    return {
      verification_required: true as const,
      verification,
      token,
    }
  }

  if (mfaChallenge) {
    return {
      mfa_required: true as const,
      mfa_challenge: mfaChallenge,
      token,
    }
  }

  return token
}

async function logoutPlatformSession(signal: AbortSignal): Promise<void> {
  await sdk.client.fetch("/auth/platform-session", {
    method: "DELETE",
    signal,
  })
  await sdk.client.clearToken()
}

async function probePlatformAdminAccess(): Promise<PlatformAdmin> {
  const response = await withPlatformAuthTimeout(
    (signal) => fetch(`${backendUrl}/admin/saas/access`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    }),
  )

  if (response.status === 403) {
    throw new PlatformAccessDeniedError()
  }

  if (!response.ok) {
    throw new PlatformAccessRequestError(response.status)
  }

  const payload = (await response.json().catch(() => null)) as {
    authorized?: unknown
    actor?: unknown
  } | null

  if (payload?.authorized !== true || !isPlatformAdmin(payload.actor)) {
    throw new PlatformAccessDeniedError()
  }

  return payload.actor
}

async function probeAccessAndClearDeniedSession(): Promise<PlatformAdmin> {
  try {
    return await probePlatformAdminAccess()
  } catch (error) {
    if (error instanceof PlatformAccessDeniedError) {
      await withPlatformAuthTimeout(logoutPlatformSession).catch(() => undefined)
    }

    throw error
  }
}

export async function signInPlatformAdmin(
  email: string,
  password: string,
  remember?: boolean,
): Promise<PlatformAdmin> {
  const result = await withPlatformAuthTimeout(
    (signal) => loginPlatformSession(email, password, signal),
  )

  if (typeof result !== "string") {
    if ("location" in result && typeof result.location === "string") {
      window.location.assign(result.location)
      throw new PlatformAuthStepRequiredError("جارٍ تحويلك لإكمال تسجيل الدخول.")
    }

    if ("mfa_required" in result) {
      throw new PlatformAuthStepRequiredError(
        "يتطلب هذا الحساب رمز تحقق إضافياً. أكمل التحقق من خلال مسؤول النظام.",
      )
    }

    throw new PlatformAuthStepRequiredError(
      "يجب التحقق من الحساب قبل الدخول إلى لوحة الإدارة.",
    )
  }

  if (typeof remember === "boolean") {
    await withPlatformAuthTimeout(signal => sdk.client.fetch("/auth/platform-session", {
      method: "POST", body: { remember }, headers: { Authorization: `Bearer ${result}` }, signal,
    }).then(() => undefined))
  }
  return await probeAccessAndClearDeniedSession()
}

export async function getCurrentPlatformAdmin(): Promise<PlatformAdmin> {
  try { return await probeAccessAndClearDeniedSession() }
  catch (error) {
    if (error instanceof PlatformAccessRequestError && error.status === 401 && await restorePlatformSession()) {
      return await probeAccessAndClearDeniedSession()
    }
    throw error
  }
}

export const isPlatformSessionRejected = (error: unknown): boolean =>
  error instanceof PlatformAccessDeniedError ||
  (error instanceof PlatformAccessRequestError && [401, 403].includes(error.status))

export async function signOutPlatformAdmin(): Promise<void> {
  await withPlatformAuthTimeout(logoutPlatformSession)
}

export async function requestPlatformPasswordReset(email: string): Promise<void> {
  await withPlatformAuthTimeout(
    (signal) => sdk.client.fetch("/auth/user/emailpass/reset-password", {
      method: "POST",
      body: { identifier: email },
      headers: { accept: "text/plain" },
      signal,
    }).then(() => undefined),
  )
}

export function platformAuthErrorMessage(error: unknown): string {
  if (error instanceof PlatformAuthTimeoutError) {
    return "لم يستجب خادم المنصة في الوقت المحدد. تحقق من تشغيل الخادم ثم حاول مجدداً."
  }

  if (error instanceof PlatformAuthStepRequiredError) {
    return error.message
  }

  if (
    error instanceof PlatformAccessDeniedError ||
    (error instanceof PlatformAccessRequestError && error.status === 403)
  ) {
    return "هذا الحساب لا يملك صلاحية Super Admin للوصول إلى الإدارة الرئيسية."
  }

  if (error instanceof FetchError) {
    if (error.status === 401) {
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة."
    }

    if (error.status === 403) {
      return "هذا الحساب لا يملك صلاحية الوصول إلى الإدارة الرئيسية."
    }

    if (error.status === 429) {
      return "تم تجاوز عدد محاولات الدخول. انتظر قليلاً ثم حاول مرة أخرى."
    }
  }

  if (error instanceof TypeError) {
    return "تعذّر الاتصال بخادم المنصة. تحقق من تشغيل الخادم ثم حاول مجدداً."
  }

  return "تعذّر تسجيل الدخول الآن. حاول مرة أخرى بعد قليل."
}
