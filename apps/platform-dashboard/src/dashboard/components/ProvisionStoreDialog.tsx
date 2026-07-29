import {
  CheckCircleSolid,
  CircleWarningSolid,
  Globe,
  Loader,
  Plus,
  ShieldCheck,
  XMark,
} from "@medusajs/icons"
import { FormEvent, useMemo, useState } from "react"

import { provisionPlatformStore } from "../api"
import type { ProvisionStoreRequest, ProvisionStoreResult } from "../types"

type ProvisionStoreDialogProps = {
  open: boolean
  onClose: () => void
  onProvisioned: () => Promise<void>
}

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export function ProvisionStoreDialog({
  open,
  onClose,
  onProvisioned,
}: ProvisionStoreDialogProps) {
  const [clientName, setClientName] = useState("")
  const [storeName, setStoreName] = useState("")
  const [handle, setHandle] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [password, setPassword] = useState("")
  const [customDomain, setCustomDomain] = useState("")
  const [plan, setPlan] = useState<"starter_whatsapp" | "professional_commerce">(
    "professional_commerce",
  )
  const [reuseOwner, setReuseOwner] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProvisionStoreResult | null>(null)

  const normalizedHandle = useMemo(
    () => normalizeKey(handle || storeName || clientName),
    [clientName, handle, storeName],
  )

  if (!open) {
    return null
  }

  const resetAndClose = () => {
    if (submitting) return
    setError(null)
    setResult(null)
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!clientName.trim() || !storeName.trim() || !normalizedHandle || !ownerEmail.trim()) {
      setError("أكمل بيانات العميل والمتجر والمالك قبل بدء التهيئة.")
      return
    }

    if (!reuseOwner && password.length < 8) {
      setError("كلمة المرور المؤقتة يجب أن تتكون من 8 أحرف على الأقل.")
      return
    }

    const request: ProvisionStoreRequest = {
      tenant: {
        name: clientName.trim(),
        key: normalizeKey(clientName),
        reuse_existing: false,
      },
      store: {
        name: storeName.trim(),
        handle: normalizedHandle,
        plan_code: plan,
        locale: "ar-LY",
        timezone: "Africa/Tripoli",
        currency_code: "lyd",
        status_after_provisioning: "active",
      },
      owner: {
        email: ownerEmail.trim().toLowerCase(),
        ...(ownerName.trim() ? { display_name: ownerName.trim() } : {}),
        ...(!reuseOwner ? { initial_password: password } : {}),
        reuse_existing_account: reuseOwner,
      },
      brand: {
        primary_color: "#008cff",
        secondary_color: "#00c8ff",
      },
      commerce: {
        region_name: `${storeName.trim()} - ليبيا`,
        countries: ["ly"],
        stock_location_name: `${storeName.trim()} - المخزون الرئيسي`,
        sales_channel_name: `${storeName.trim()} - القناة الرئيسية`,
      },
      contact: {
        public_email: ownerEmail.trim().toLowerCase(),
      },
      domain: {
        ...(customDomain.trim().toLowerCase()
          ? { custom_hostname: customDomain.trim().toLowerCase() }
          : {}),
      },
    }

    setSubmitting(true)
    try {
      const provisioning = await provisionPlatformStore(request)
      setPassword("")
      setResult(provisioning)
      await onProvisioned()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذرت تهيئة المتجر الآن.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={resetAndClose}>
      <section
        className="provision-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provision-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <header>
          <div className="provision-dialog__icon">
            <ShieldCheck />
          </div>
          <div>
            <h2 id="provision-dialog-title">تهيئة عميل جديد ومتجره الأول</h2>
            <p>
              ينشئ هذا المسار عميلاً جديداً ومتجراً واحداً مع النطاق وحساب المالك وموارد
              التجارة. إضافة متجر إلى عميل قائم غير متاحة من هذا المسار حالياً.
            </p>
          </div>
          <button type="button" onClick={resetAndClose} aria-label="إغلاق">
            <XMark />
          </button>
        </header>

        {result ? (
          <div className="provision-success">
            <CheckCircleSolid />
            <h3>تم إنشاء المتجر بنجاح</h3>
            <p>
              أصبح <strong>{result.handle}</strong> جاهزاً داخل محفظة العملاء.
            </p>
            <dl>
              <div>
                <dt>النطاق المؤقت</dt>
                <dd>{result.public_domain}</dd>
              </div>
              <div>
                <dt>حساب المالك</dt>
                <dd>{result.owner_email}</dd>
              </div>
            </dl>
            <button className="primary-action" type="button" onClick={resetAndClose}>
              فتح المحفظة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="provision-form-grid">
              <label>
                <span>اسم العميل / الشركة</span>
                <input
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="مثال: أزياء الربيع"
                  autoFocus
                />
              </label>
              <label>
                <span>اسم المتجر</span>
                <input
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="العلامة التجارية للمتجر"
                />
              </label>
              <label>
                <span>معرّف المتجر</span>
                <input
                  dir="ltr"
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  placeholder={normalizedHandle || "store-handle"}
                />
                <small>{normalizedHandle || "سيُنشأ تلقائياً من اسم المتجر"}</small>
              </label>
              <label>
                <span>الخطة</span>
                <select value={plan} onChange={(event) => setPlan(event.target.value as typeof plan)}>
                  <option value="professional_commerce">التجارة الاحترافية</option>
                  <option value="starter_whatsapp">واتساب المبدئية</option>
                </select>
              </label>
              <label>
                <span>اسم مالك المتجر</span>
                <input
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  placeholder="الاسم الكامل"
                />
              </label>
              <label>
                <span>بريد مالك المتجر</span>
                <input
                  dir="ltr"
                  type="email"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  placeholder="owner@example.com"
                  autoComplete="off"
                />
              </label>
              <label className="provision-domain-field">
                <span>النطاق المخصص (اختياري)</span>
                <div>
                  <Globe />
                  <input
                    dir="ltr"
                    value={customDomain}
                    onChange={(event) => setCustomDomain(event.target.value)}
                    placeholder="store.example.com"
                  />
                </div>
                <small>يُسجّل كنطاق معلّق؛ التحقق الآلي وSSL خارج المرحلة الحالية.</small>
              </label>
              <label>
                <span>كلمة مرور مؤقتة</span>
                <input
                  dir="ltr"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={reuseOwner ? "لا تُطلب عند إعادة استخدام الحساب" : "8 أحرف على الأقل"}
                  autoComplete="new-password"
                  disabled={reuseOwner}
                />
                <small>لا تُحفظ في لوحة التحكم أو سجل التهيئة.</small>
              </label>
            </div>

            <label className="reuse-owner-control">
              <input
                type="checkbox"
                checked={reuseOwner}
                onChange={(event) => {
                  setReuseOwner(event.target.checked)
                  if (event.target.checked) setPassword("")
                }}
              />
              <span>استخدام حساب مالك موجود مسبقاً</span>
            </label>

            {error ? (
              <div className="provision-error" role="alert">
                <CircleWarningSolid />
                <span>{error}</span>
              </div>
            ) : null}

            <footer>
              <button type="button" onClick={resetAndClose} disabled={submitting}>
                إلغاء
              </button>
              <button className="primary-action" type="submit" disabled={submitting}>
                {submitting ? <Loader className="spin" /> : <Plus />}
                {submitting ? "جارٍ تهيئة المتجر..." : "بدء التهيئة"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  )
}
