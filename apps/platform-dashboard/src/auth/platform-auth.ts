import Medusa, { FetchError } from "@medusajs/js-sdk"

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

export const platformAdminAfterLoginUrl =
  configuredAfterLoginUrl && configuredAfterLoginUrl !== "/app"
    ? configuredAfterLoginUrl
    : "/dashboard/clients"

export const platformSupportEmail =
  import.meta.env.VITE_PLATFORM_SUPPORT_EMAIL?.trim() || "support@labibtech.ly"

export type PlatformAdmin = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

export class PlatformAuthStepRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PlatformAuthStepRequiredError"
  }
}

export async function signInPlatformAdmin(
  email: string,
  password: string,
): Promise<PlatformAdmin> {
  const result = await sdk.auth.login("user", "emailpass", {
    email,
    password,
  })

  if (typeof result !== "string") {
    if ("location" in result) {
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

  const { user } = await sdk.admin.user.me({
    fields: "id,email,first_name,last_name",
  })

  return user as PlatformAdmin
}

export async function getCurrentPlatformAdmin(): Promise<PlatformAdmin> {
  const { user } = await sdk.admin.user.me({
    fields: "id,email,first_name,last_name",
  })

  return user as PlatformAdmin
}

export async function signOutPlatformAdmin(): Promise<void> {
  await sdk.auth.logout()
}

export async function requestPlatformPasswordReset(email: string): Promise<void> {
  await sdk.auth.resetPassword("user", "emailpass", {
    identifier: email,
  })
}

export function platformAuthErrorMessage(error: unknown): string {
  if (error instanceof PlatformAuthStepRequiredError) {
    return error.message
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
