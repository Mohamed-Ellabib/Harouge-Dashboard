import { FormEvent, useEffect, useMemo, useState } from "react"

type Vendor = {
  id: string
  name: string
  handle: string
  domains: string[]
  branding: {
    logo_url: string | null
    primary_color: string | null
  }
}

type VendorMember = {
  id: string
  email: string
  role: "owner" | "manager"
  status: "active" | "disabled"
}

type VendorProduct = {
  id: string
  title: string
  handle: string
  status: "draft" | "proposed" | "published" | "rejected"
  thumbnail: string | null
  description?: string | null
  variants?: VendorProductVariant[]
}

type VendorProductPrice = {
  id?: string
  amount: number | string | null
  currency_code: string | null
}

type VendorProductVariant = {
  id: string
  title: string
  sku: string | null
  manage_inventory: boolean
  allow_backorder?: boolean
  prices?: VendorProductPrice[]
}

type VendorOrderItem = {
  id: string
  title: string
  quantity: number
  unit_price: number | null
  total: number
  product_id: string | null
  variant_title: string | null
}

type VendorOrder = {
  id: string
  display_id: number | string | null
  status: string
  email: string | null
  currency_code: string | null
  vendor_total: number
  created_at: string
  items: VendorOrderItem[]
}

type VendorMeResponse = {
  vendor: Vendor
  member: VendorMember
}

type ProductForm = {
  title: string
  handle: string
  status: VendorProduct["status"]
  description: string
  thumbnail: string
  price: string
  currency_code: string
  sku: string
  variant_title: string
}

type PasswordForm = {
  current_password: string
  new_password: string
  confirm_password: string
}

type Notice = {
  tone: "success" | "error" | "info"
  text: string
}

type TabId = "home" | "products" | "orders" | "profile" | "security"

const emptyProductForm: ProductForm = {
  title: "",
  handle: "",
  status: "published",
  description: "",
  thumbnail: "",
  price: "",
  currency_code: "eur",
  sku: "",
  variant_title: "",
}

const emptyPasswordForm: PasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
}

const defaultApiBase = () => {
  if (typeof window === "undefined" || !window.location.hostname) {
    return "http://localhost:9000"
  }

  return `${window.location.protocol}//${window.location.hostname}:9000`
}

const API_BASE = (
  import.meta.env.VITE_MEDUSA_BACKEND_URL || defaultApiBase()
).replace(/\/$/, "")

const statusLabels: Record<VendorProduct["status"], string> = {
  draft: "مسودة",
  proposed: "مقترح",
  published: "منشور",
  rejected: "مرفوض",
}

const editableProductStatuses: VendorProduct["status"][] = [
  "published",
  "draft",
]

const currencyOptions = ["eur", "usd"] as const

const orderStatusLabels: Record<string, string> = {
  pending: "قيد المعالجة",
  completed: "مكتمل",
  canceled: "ملغي",
  archived: "مؤرشف",
  requires_action: "يتطلب إجراء",
}

const navItems: {
  id: TabId
  label: string
  icon: string
}[] = [
  {
    id: "home",
    label: "الرئيسية",
    icon: "M4 12 12 5l8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
  },
  {
    id: "products",
    label: "المنتجات",
    icon: "M5 7l7-4 7 4v10l-7 4-7-4z",
  },
  {
    id: "orders",
    label: "الطلبات",
    icon: "M6 6h15l-2 9H8zM6 6 5 3H2m7 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  },
  {
    id: "profile",
    label: "ملف المتجر",
    icon: "M5 20V8l7-4 7 4v12M8 12h8M8 16h8",
  },
  {
    id: "security",
    label: "الحماية",
    icon: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6zM9.5 12l1.6 1.6L15 9.8",
  },
]

const request = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`

    try {
      const data = await response.json()
      message = data.message || message
    } catch {
      // Keep HTTP fallback.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const getPrimaryVariant = (product: VendorProduct) => product.variants?.[0]

const getPrimaryPrice = (product: VendorProduct) =>
  getPrimaryVariant(product)?.prices?.[0]

const normalizeAmountValue = (amount: number | string | null | undefined) => {
  if (amount === null || amount === undefined || amount === "") {
    return ""
  }

  return String(amount)
}

const productToForm = (product: VendorProduct): ProductForm => {
  const primaryVariant = getPrimaryVariant(product)
  const primaryPrice = getPrimaryPrice(product)

  return {
    title: product.title ?? "",
    handle: product.handle ?? "",
    status: editableProductStatuses.includes(product.status)
      ? product.status
      : "draft",
    description: product.description ?? "",
    thumbnail: product.thumbnail ?? "",
    price: normalizeAmountValue(primaryPrice?.amount),
    currency_code: primaryPrice?.currency_code ?? "eur",
    sku: primaryVariant?.sku ?? "",
    variant_title: primaryVariant?.title ?? product.title ?? "",
  }
}

const formatProductPrice = (product: VendorProduct) => {
  const price = getPrimaryPrice(product)

  if (!price || price.amount === null || price.amount === undefined) {
    return "بدون سعر"
  }

  return formatAmount(Number(price.amount), price.currency_code)
}

const formatInventoryMode = (product: VendorProduct) => {
  const variant = getPrimaryVariant(product)

  if (!variant) {
    return "بدون نسخة"
  }

  return variant.manage_inventory ? "متتبع" : "غير متتبع"
}

const formatAmount = (amount: number, currency: string | null) => {
  const formatted = Number.isFinite(Number(amount))
    ? Number(amount).toLocaleString("ar")
    : "0"

  return currency ? `${formatted} ${currency.toUpperCase()}` : formatted
}

const formatDate = (value: string) => {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ar", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
}

const Icon = ({ path }: { path: string }) => (
  <svg aria-hidden="true" className="icon" viewBox="0 0 24 24">
    <path d={path} />
  </svg>
)

const StatusPill = ({ status }: { status: VendorProduct["status"] }) => (
  <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
)

function LoginScreen({
  onLogin,
  isLoading,
  notice,
}: {
  onLogin: (email: string, password: string) => Promise<void>
  isLoading: boolean
  notice: Notice | null
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onLogin(email, password)
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel">
        <div className="brand-lockup">
          <div className="brand-mark">ف</div>
          <div>
            <p>منصة المتاجر</p>
            <h1>دخول البائع</h1>
          </div>
        </div>
        <p className="login-copy">
          استخدم حساب البائع المرتبط بمتجرك. ستظهر هنا بيانات المتجر
          والمنتجات والطلبات الخاصة بك فقط.
        </p>
        {notice && <div className={`notice notice-${notice.tone}`}>{notice.text}</div>}
        <form className="login-form" onSubmit={submit}>
          <label>
            البريد الإلكتروني
            <input
              autoComplete="email"
              dir="ltr"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vendor@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            كلمة المرور
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
              type="password"
              value={password}
            />
          </label>
          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? "جار تسجيل الدخول..." : "دخول لوحة البائع"}
          </button>
        </form>
      </section>
      <aside className="login-preview" aria-hidden="true">
        <div className="preview-header">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-grid">
          <div />
          <div />
          <div />
        </div>
        <div className="preview-table">
          <span />
          <span />
          <span />
          <span />
        </div>
      </aside>
    </main>
  )
}

function Dashboard({
  vendor,
  member,
  products,
  orders,
  selectedProduct,
  productForm,
  passwordForm,
  activeTab,
  isCreatingProduct,
  isSavingProduct,
  isSavingPassword,
  notice,
  onLogout,
  onTabChange,
  onStartCreateProduct,
  onCancelProductEdit,
  onSelectProduct,
  onProductFormChange,
  onPasswordFormChange,
  onSaveProduct,
  onSavePassword,
}: {
  vendor: Vendor
  member: VendorMember
  products: VendorProduct[]
  orders: VendorOrder[]
  selectedProduct: VendorProduct | null
  productForm: ProductForm
  passwordForm: PasswordForm
  activeTab: TabId
  isCreatingProduct: boolean
  isSavingProduct: boolean
  isSavingPassword: boolean
  notice: Notice | null
  onLogout: () => Promise<void>
  onTabChange: (tab: TabId) => void
  onStartCreateProduct: () => void
  onCancelProductEdit: () => void
  onSelectProduct: (product: VendorProduct) => void
  onProductFormChange: (form: ProductForm) => void
  onPasswordFormChange: (form: PasswordForm) => void
  onSaveProduct: () => Promise<void>
  onSavePassword: () => Promise<void>
}) {
  const counts = useMemo(() => {
    const draft = products.filter((product) => product.status === "draft").length
    const published = products.filter(
      (product) => product.status === "published"
    ).length

    return {
      assigned: products.length,
      draft,
      published,
      orders: orders.length,
    }
  }, [orders.length, products])

  const domains = vendor.domains.length ? vendor.domains.join("، ") : "بدون نطاق"
  const canEditProduct = Boolean(selectedProduct || isCreatingProduct)

  return (
    <main className="dashboard-shell" dir="rtl">
      <aside className="sidebar">
        <div className="vendor-lockup">
          <div className="vendor-mark">
            {vendor.name.trim().slice(0, 1) || "م"}
          </div>
          <div>
            <strong>{vendor.name}</strong>
            <span>{vendor.handle}</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="تنقل لوحة البائع">
          {navItems.map((item) => (
            <button
              className={`nav-item ${item.id === activeTab ? "active" : ""}`}
              key={item.id}
              onClick={() => onTabChange(item.id)}
              type="button"
            >
              <Icon path={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
        <button className="logout-button" onClick={onLogout} type="button">
          تسجيل الخروج
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>لوحة البائع</h1>
            <p>إدارة المنتجات والطلبات المرتبطة بمتجرك فقط.</p>
          </div>
          <div className="account-chip">
            <span>{member.role === "owner" ? "مالك" : "مدير"}</span>
            <strong dir="ltr">{member.email}</strong>
          </div>
        </header>

        {notice && <div className={`notice notice-${notice.tone}`}>{notice.text}</div>}

        <section className="metric-grid" aria-label="ملخص المتجر">
          <article>
            <span>منتجات مرتبطة</span>
            <strong>{counts.assigned}</strong>
          </article>
          <article>
            <span>منشورة</span>
            <strong>{counts.published}</strong>
          </article>
          <article>
            <span>مسودات</span>
            <strong>{counts.draft}</strong>
          </article>
          <article className="accent-metric">
            <span>طلبات ظاهرة</span>
            <strong>{counts.orders}</strong>
          </article>
        </section>

        {(activeTab === "home" || activeTab === "products") && (
          <div className="content-grid">
            <section className="product-panel">
              <div className="panel-heading">
                <div>
                  <h2>المنتجات</h2>
                  <p>هذه المنتجات مرتبطة بهذا البائع فقط.</p>
                </div>
                <button
                  className="secondary-button"
                  onClick={onStartCreateProduct}
                  type="button"
                >
                  إنشاء منتج
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>المعرف</th>
                      <th>الحالة</th>
                      <th>السعر</th>
                      <th>المخزون</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="empty-state">
                            لا توجد منتجات مرتبطة بهذا المتجر بعد.
                          </div>
                        </td>
                      </tr>
                    )}
                    {products.map((product) => (
                      <tr
                        className={
                          selectedProduct?.id === product.id ? "selected-row" : ""
                        }
                        key={product.id}
                      >
                        <td>
                          <div className="product-cell">
                            <div className="thumb">
                              {product.thumbnail ? (
                                <img alt="" src={product.thumbnail} />
                              ) : (
                                product.title.slice(0, 1)
                              )}
                            </div>
                            <strong>{product.title}</strong>
                          </div>
                        </td>
                        <td dir="ltr">{product.handle}</td>
                        <td>
                          <StatusPill status={product.status} />
                        </td>
                        <td dir="ltr">{formatProductPrice(product)}</td>
                        <td>{formatInventoryMode(product)}</td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => onSelectProduct(product)}
                            type="button"
                          >
                            تعديل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="detail-panel">
              <section className="store-card">
                <div className="panel-heading compact">
                  <div>
                    <h2>ملف المتجر</h2>
                    <p>بيانات القراءة فقط في لوحة البائع.</p>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>النطاق</dt>
                    <dd>{domains}</dd>
                  </div>
                  <div>
                    <dt>البريد</dt>
                    <dd dir="ltr">{member.email}</dd>
                  </div>
                  <div>
                    <dt>الدور</dt>
                    <dd>{member.role === "owner" ? "مالك" : "مدير"}</dd>
                  </div>
                  <div>
                    <dt>اللون</dt>
                    <dd className="color-row">
                      <span
                        style={{
                          backgroundColor:
                            vendor.branding.primary_color || "#14b8a6",
                        }}
                      />
                      {vendor.branding.primary_color || "#14b8a6"}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="editor-card">
                <div className="panel-heading compact">
                  <div>
                    <h2>{isCreatingProduct ? "إنشاء منتج" : "تعديل المنتج"}</h2>
                    <p>
                      {isCreatingProduct
                        ? "أضف منتجًا جديدًا كمسودة داخل هذا المتجر."
                        : selectedProduct
                          ? "احفظ التغييرات على المنتج المحدد."
                          : "اختر منتجًا من الجدول أو أنشئ منتجًا جديدًا."}
                    </p>
                  </div>
                </div>
                <fieldset disabled={!canEditProduct || isSavingProduct}>
                  <label>
                    الاسم
                    <input
                      onChange={(event) => {
                        const title = event.target.value
                        onProductFormChange({
                          ...productForm,
                          title,
                          handle: productForm.handle || slugify(title),
                          variant_title: productForm.variant_title || title,
                        })
                      }}
                      value={productForm.title}
                    />
                  </label>
                  <label>
                    المعرف
                    <input
                      dir="ltr"
                      onChange={(event) =>
                        onProductFormChange({
                          ...productForm,
                          handle: event.target.value,
                        })
                      }
                      value={productForm.handle}
                    />
                  </label>
                  <label>
                    الحالة
                    <select
                      onChange={(event) =>
                        onProductFormChange({
                          ...productForm,
                          status: event.target.value as VendorProduct["status"],
                        })
                      }
                      value={productForm.status}
                    >
                      {editableProductStatuses.map((value) => (
                        <option key={value} value={value}>
                          {statusLabels[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-row">
                    <label>
                      السعر
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        min="0"
                        onChange={(event) =>
                          onProductFormChange({
                            ...productForm,
                            price: event.target.value,
                          })
                        }
                        placeholder="15"
                        type="number"
                        value={productForm.price}
                      />
                    </label>
                    <label>
                      العملة
                      <select
                        dir="ltr"
                        onChange={(event) =>
                          onProductFormChange({
                            ...productForm,
                            currency_code: event.target.value,
                          })
                        }
                        value={productForm.currency_code}
                      >
                        {currencyOptions.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      رمز المنتج
                      <input
                        dir="ltr"
                        onChange={(event) =>
                          onProductFormChange({
                            ...productForm,
                            sku: event.target.value,
                          })
                        }
                        placeholder="SKU-001"
                        value={productForm.sku}
                      />
                    </label>
                    <label>
                      اسم النسخة
                      <input
                        onChange={(event) =>
                          onProductFormChange({
                            ...productForm,
                            variant_title: event.target.value,
                          })
                        }
                        placeholder={productForm.title || "Default"}
                        value={productForm.variant_title}
                      />
                    </label>
                  </div>
                  <label>
                    رابط الصورة
                    <input
                      dir="ltr"
                      onChange={(event) =>
                        onProductFormChange({
                          ...productForm,
                          thumbnail: event.target.value,
                        })
                      }
                      placeholder="https://..."
                      value={productForm.thumbnail}
                    />
                  </label>
                  <label>
                    الوصف
                    <textarea
                      onChange={(event) =>
                        onProductFormChange({
                          ...productForm,
                          description: event.target.value,
                        })
                      }
                      rows={4}
                      value={productForm.description}
                    />
                  </label>
                  <div className="button-row">
                    <button
                      className="primary-button"
                      onClick={onSaveProduct}
                      type="button"
                    >
                      {isSavingProduct
                        ? "جار الحفظ..."
                        : isCreatingProduct
                          ? "إنشاء المنتج"
                          : "حفظ المنتج"}
                    </button>
                    {canEditProduct && (
                      <button
                        className="secondary-button"
                        onClick={onCancelProductEdit}
                        type="button"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </fieldset>
              </section>
            </aside>
          </div>
        )}

        {activeTab === "orders" && (
          <section className="orders-panel">
            <div className="panel-heading">
              <div>
                <h2>الطلبات</h2>
                <p>تظهر فقط الطلبات التي تحتوي منتجات مرتبطة بهذا المتجر.</p>
              </div>
            </div>
            {!orders.length && (
              <div className="empty-state">لا توجد طلبات لهذا المتجر بعد.</div>
            )}
            {orders.length > 0 && (
              <div className="order-list">
                {orders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-summary">
                      <div>
                        <strong>
                          طلب #{order.display_id ?? order.id.slice(-6)}
                        </strong>
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                      <div>
                        <span>
                          {orderStatusLabels[order.status] ?? order.status}
                        </span>
                        <strong>
                          {formatAmount(order.vendor_total, order.currency_code)}
                        </strong>
                      </div>
                    </div>
                    <div className="line-items">
                      {order.items.map((item) => (
                        <div key={item.id}>
                          <span>{item.title}</span>
                          <span>
                            {item.quantity} ×{" "}
                            {formatAmount(item.unit_price ?? 0, order.currency_code)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {order.email && <p dir="ltr">{order.email}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "profile" && (
          <section className="profile-panel">
            <div className="panel-heading">
              <div>
                <h2>ملف المتجر</h2>
                <p>هذه البيانات تأتي من إعدادات البائع في لوحة الإدارة.</p>
              </div>
            </div>
            <dl className="profile-grid">
              <div>
                <dt>اسم المتجر</dt>
                <dd>{vendor.name}</dd>
              </div>
              <div>
                <dt>المعرف</dt>
                <dd dir="ltr">{vendor.handle}</dd>
              </div>
              <div>
                <dt>النطاقات</dt>
                <dd>{domains}</dd>
              </div>
              <div>
                <dt>لون العلامة</dt>
                <dd className="color-row">
                  <span
                    style={{
                      backgroundColor: vendor.branding.primary_color || "#14b8a6",
                    }}
                  />
                  {vendor.branding.primary_color || "#14b8a6"}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {activeTab === "security" && (
          <section className="security-panel">
            <div className="panel-heading">
              <div>
                <h2>الحماية</h2>
                <p>غيّر كلمة مرور حسابك من داخل لوحة البائع.</p>
              </div>
            </div>
            <form
              className="security-form"
              onSubmit={(event) => {
                event.preventDefault()
                void onSavePassword()
              }}
            >
              <label>
                كلمة المرور الحالية
                <input
                  autoComplete="current-password"
                  onChange={(event) =>
                    onPasswordFormChange({
                      ...passwordForm,
                      current_password: event.target.value,
                    })
                  }
                  required
                  type="password"
                  value={passwordForm.current_password}
                />
              </label>
              <label>
                كلمة المرور الجديدة
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) =>
                    onPasswordFormChange({
                      ...passwordForm,
                      new_password: event.target.value,
                    })
                  }
                  required
                  type="password"
                  value={passwordForm.new_password}
                />
              </label>
              <label>
                تأكيد كلمة المرور
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) =>
                    onPasswordFormChange({
                      ...passwordForm,
                      confirm_password: event.target.value,
                    })
                  }
                  required
                  type="password"
                  value={passwordForm.confirm_password}
                />
              </label>
              <button
                className="primary-button"
                disabled={isSavingPassword}
                type="submit"
              >
                {isSavingPassword ? "جار التحديث..." : "تغيير كلمة المرور"}
              </button>
            </form>
          </section>
        )}
      </section>
    </main>
  )
}

export default function App() {
  const [me, setMe] = useState<VendorMeResponse | null>(null)
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [selectedProduct, setSelectedProduct] = useState<VendorProduct | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm)
  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(emptyPasswordForm)
  const [activeTab, setActiveTab] = useState<TabId>("home")
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const loadVendor = async () => {
    const [vendorMe, productData, orderData] = await Promise.all([
      request<VendorMeResponse>("/vendor/me"),
      request<{ products: VendorProduct[]; count: number }>("/vendor/products"),
      request<{ orders: VendorOrder[]; count: number }>("/vendor/orders").catch(
        () => ({ orders: [], count: 0 })
      ),
    ])

    setMe(vendorMe)
    setProducts(productData.products)
    setOrders(orderData.orders)

    if (productData.products.length) {
      setSelectedProduct(productData.products[0])
      setProductForm(productToForm(productData.products[0]))
      setIsCreatingProduct(false)
    } else {
      setSelectedProduct(null)
      setProductForm(emptyProductForm)
    }
  }

  useEffect(() => {
    loadVendor()
      .catch(() => {
        setMe(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoggingIn(true)
    setNotice(null)

    try {
      await request<VendorMeResponse>("/vendor/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      await loadVendor()
      setNotice({ tone: "success", text: "تم تسجيل الدخول بنجاح." })
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "تعذر تسجيل الدخول إلى لوحة البائع.",
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const logout = async () => {
    await request("/vendor/auth/logout", { method: "POST" }).catch(() => null)
    setMe(null)
    setProducts([])
    setOrders([])
    setSelectedProduct(null)
    setProductForm(emptyProductForm)
    setPasswordForm(emptyPasswordForm)
    setActiveTab("home")
    setNotice({ tone: "info", text: "تم تسجيل الخروج." })
  }

  const selectProduct = (product: VendorProduct) => {
    setActiveTab("products")
    setIsCreatingProduct(false)
    setSelectedProduct(product)
    setProductForm(productToForm(product))
  }

  const startCreateProduct = () => {
    setActiveTab("products")
    setIsCreatingProduct(true)
    setSelectedProduct(null)
    setProductForm(emptyProductForm)
  }

  const cancelProductEdit = () => {
    setIsCreatingProduct(false)

    if (products.length) {
      setSelectedProduct(products[0])
      setProductForm(productToForm(products[0]))
    } else {
      setSelectedProduct(null)
      setProductForm(emptyProductForm)
    }
  }

  const saveProduct = async () => {
    if (!isCreatingProduct && !selectedProduct) {
      return
    }

    setIsSavingProduct(true)
    setNotice(null)

    try {
      const price = productForm.price.trim()

      if (isCreatingProduct && !price) {
        setNotice({
          tone: "error",
          text: "السعر مطلوب قبل نشر المنتج.",
        })
        return
      }

      const hasVariant = Boolean(selectedProduct?.variants?.length)
      const shouldSendVariant = isCreatingProduct || hasVariant || Boolean(price)
      const payload: Record<string, string> = {
        title: productForm.title,
        handle: productForm.handle,
        status: productForm.status,
        description: productForm.description,
        thumbnail: productForm.thumbnail,
      }

      if (shouldSendVariant) {
        payload.currency_code = productForm.currency_code
        payload.sku = productForm.sku
        payload.variant_title = productForm.variant_title || productForm.title

        if (price) {
          payload.price = price
        }
      }

      const data = await request<{ product: VendorProduct }>(
        isCreatingProduct
          ? "/vendor/products"
          : `/vendor/products/${selectedProduct?.id}`,
        {
          method: isCreatingProduct ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        }
      )

      setProducts((current) =>
        isCreatingProduct
          ? [data.product, ...current]
          : current.map((product) =>
              product.id === data.product.id ? data.product : product
            )
      )
      setSelectedProduct(data.product)
      setProductForm(productToForm(data.product))
      setIsCreatingProduct(false)
      setNotice({
        tone: "success",
        text: isCreatingProduct ? "تم إنشاء المنتج." : "تم حفظ المنتج.",
      })
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "تعذر حفظ المنتج المحدد.",
      })
    } finally {
      setIsSavingProduct(false)
    }
  }

  const savePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setNotice({
        tone: "error",
        text: "تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.",
      })
      return
    }

    setIsSavingPassword(true)
    setNotice(null)

    try {
      await request<{ success: boolean }>("/vendor/auth/password", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      })
      setPasswordForm(emptyPasswordForm)
      setNotice({ tone: "success", text: "تم تغيير كلمة المرور." })
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "تعذر تغيير كلمة المرور.",
      })
    } finally {
      setIsSavingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <main className="loading-screen" dir="rtl">
        <div className="loader" />
        <span>جار تحميل لوحة البائع...</span>
      </main>
    )
  }

  if (!me) {
    return <LoginScreen isLoading={isLoggingIn} notice={notice} onLogin={login} />
  }

  return (
    <Dashboard
      activeTab={activeTab}
      isCreatingProduct={isCreatingProduct}
      isSavingPassword={isSavingPassword}
      isSavingProduct={isSavingProduct}
      member={me.member}
      notice={notice}
      onCancelProductEdit={cancelProductEdit}
      onLogout={logout}
      onPasswordFormChange={setPasswordForm}
      onProductFormChange={setProductForm}
      onSavePassword={savePassword}
      onSaveProduct={saveProduct}
      onSelectProduct={selectProduct}
      onStartCreateProduct={startCreateProduct}
      onTabChange={setActiveTab}
      orders={orders}
      passwordForm={passwordForm}
      productForm={productForm}
      products={products}
      selectedProduct={selectedProduct}
      vendor={me.vendor}
    />
  )
}
