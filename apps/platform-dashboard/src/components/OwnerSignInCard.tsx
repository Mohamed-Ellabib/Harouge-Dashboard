import {
  ArrowRight,
  CheckMini,
  CheckCircleSolid,
  CircleWarningSolid,
  Envelope,
  Eye,
  EyeSlash,
  Loader,
  LockClosedSolid,
  ShieldCheck,
} from "@medusajs/icons"
import { FormEvent, useState } from "react"
import { PiHeadsetLight, PiShieldCheckLight } from "react-icons/pi"

import {
  platformAdminAfterLoginUrl,
  platformAuthErrorMessage,
  platformSupportEmail,
  requestPlatformPasswordReset,
  signInPlatformAdmin,
} from "../auth/platform-auth"

const rememberedEmailKey = "labibtech.platform.remembered-email"
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Notice = {
  kind: "error" | "success" | "info"
  message: string
}

function initialRememberedEmail(): string {
  try {
    return window.localStorage.getItem(rememberedEmailKey) || ""
  } catch {
    return ""
  }
}

function rememberEmail(email: string, enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(rememberedEmailKey, email)
      return
    }

    window.localStorage.removeItem(rememberedEmailKey)
  } catch {
    // Authentication remains available when storage is disabled by the browser.
  }
}

export function OwnerSignInCard() {
  const rememberedEmail = initialRememberedEmail()
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(Boolean(rememberedEmail))
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [emailInvalid, setEmailInvalid] = useState(false)
  const [passwordInvalid, setPasswordInvalid] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const validateEmail = (): boolean => {
    const valid = emailPattern.test(email.trim())
    setEmailInvalid(!valid)
    return valid
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const hasValidEmail = validateEmail()
    const hasPassword = password.length > 0

    setPasswordInvalid(!hasPassword)
    setNotice(null)

    if (!hasValidEmail || !hasPassword) {
      setNotice({
        kind: "error",
        message: "أدخل بريدك الإلكتروني وكلمة المرور للمتابعة.",
      })
      return
    }

    setSubmitting(true)

    try {
      await signInPlatformAdmin(normalizedEmail, password)
      rememberEmail(normalizedEmail, remember)
      setNotice({
        kind: "success",
        message: "تم التحقق من صلاحية الإدارة. جارٍ فتح لوحة التحكم...",
      })

      window.setTimeout(() => {
        window.location.assign(platformAdminAfterLoginUrl)
      }, 650)
    } catch (error) {
      setNotice({ kind: "error", message: platformAuthErrorMessage(error) })
      setSubmitting(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!validateEmail()) {
      setNotice({
        kind: "info",
        message: "أدخل بريدك الإلكتروني أولاً لإرسال تعليمات استعادة كلمة المرور.",
      })
      return
    }

    setResetting(true)
    setNotice(null)

    try {
      await requestPlatformPasswordReset(email.trim().toLowerCase())
      setNotice({
        kind: "success",
        message:
          "إذا كان الحساب مسجلاً، فستصلك تعليمات استعادة كلمة المرور عبر البريد الإلكتروني.",
      })
    } catch (error) {
      setNotice({ kind: "error", message: platformAuthErrorMessage(error) })
    } finally {
      setResetting(false)
    }
  }

  return (
    <article className="signin-card">
      <header className="signin-heading">
        <img
          className="signin-emblem"
          src="/assets/platform-emblem.png"
          alt="شعار حماية الإدارة الرئيسية"
          width="1254"
          height="1254"
          draggable="false"
        />
        <h1>
          مرحباً بك في <span>لوحة الإدارة الرئيسية</span>
        </h1>
        <p>سجّل الدخول للوصول إلى لوحة التحكم المركزية للمنصة بالكامل</p>
      </header>

      <form className="signin-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="platform-admin-email">البريد الإلكتروني</label>
          <div className={`input-shell${emailInvalid ? " input-shell--invalid" : ""}`}>
            <input
              id="platform-admin-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="أدخل بريدك الإلكتروني"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setEmailInvalid(false)
                setNotice(null)
              }}
              aria-invalid={emailInvalid}
              aria-describedby="signin-notice"
              disabled={submitting}
            />
            <Envelope className="field-icon field-icon--left" aria-hidden="true" />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="platform-admin-password">كلمة المرور</label>
          <div className={`input-shell${passwordInvalid ? " input-shell--invalid" : ""}`}>
            <input
              id="platform-admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setPasswordInvalid(false)
                setNotice(null)
              }}
              aria-invalid={passwordInvalid}
              aria-describedby="signin-notice"
              disabled={submitting}
            />
            <button
              className="password-visibility"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              aria-pressed={showPassword}
              disabled={submitting}
            >
              {showPassword ? <EyeSlash aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
            <LockClosedSolid className="field-icon field-icon--left" aria-hidden="true" />
          </div>
        </div>

        <div className="form-options">
          <label className="remember-control">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              disabled={submitting}
            />
            <span className="remember-control__box" aria-hidden="true">
              <CheckMini />
            </span>
            <span>تذكّرني</span>
          </label>

          <button
            className="forgot-password"
            type="button"
            onClick={handlePasswordReset}
            disabled={submitting || resetting}
          >
            {resetting ? "جارٍ الإرسال..." : "نسيت كلمة المرور؟"}
          </button>
        </div>

        <div
          id="signin-notice"
          className={`signin-notice${notice ? ` signin-notice--${notice.kind}` : ""}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {notice ? (
            <>
              {notice.kind === "success" ? (
                <CheckCircleSolid aria-hidden="true" />
              ) : notice.kind === "error" ? (
                <CircleWarningSolid aria-hidden="true" />
              ) : (
                <ShieldCheck aria-hidden="true" />
              )}
              <span>{notice.message}</span>
            </>
          ) : null}
        </div>

        <button className="signin-button" type="submit" disabled={submitting}>
          <span>{submitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}</span>
          {submitting ? (
            <Loader className="signin-button__loader" aria-hidden="true" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}
        </button>
      </form>

      <footer className="signin-footer">
        <div className="trust-divider" aria-hidden="true">
          <span />
          <PiShieldCheckLight />
          <span />
        </div>
        <a href={`mailto:${platformSupportEmail}`}>
          <PiHeadsetLight aria-hidden="true" />
          <span>
            تحتاج إلى صلاحية إدارية؟ تواصل مع فريق <strong>LabibTech</strong>
          </span>
        </a>
      </footer>
    </article>
  )
}
