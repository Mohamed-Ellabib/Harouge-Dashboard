import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Headset,
  LockKey,
  Storefront,
} from "@phosphor-icons/react";

import { MerchantDashboard } from "./MerchantDashboard";

type Vendor = {
  id: string;
  name: string;
  handle: string;
  domains: string[];
  branding: {
    logo_url: string | null;
    primary_color: string | null;
  };
};

type VendorMember = {
  id: string;
  email: string;
  role: "owner" | "manager";
  status: "active" | "disabled";
};

type VendorProduct = {
  id: string;
  title: string;
  handle: string;
  status: "draft" | "proposed" | "published" | "rejected";
  thumbnail: string | null;
  description?: string | null;
  images?: VendorProductImage[];
  variants?: VendorProductVariant[];
};

type VendorProductImage = {
  id?: string;
  url: string;
  rank?: number | null;
};

type VendorProductPrice = {
  id?: string;
  amount: number | string | null;
  currency_code: string | null;
};

type VendorProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  manage_inventory: boolean;
  allow_backorder?: boolean;
  inventory_quantity?: number | null;
  available_quantity?: number | null;
  options?: Array<{
    value: string;
    option_id?: string;
    option?: { id?: string; title?: string };
  }>;
  prices?: VendorProductPrice[];
};

type VendorOrderItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number | null;
  total: number;
  product_id: string | null;
  variant_title: string | null;
};

type VendorOrder = {
  id: string;
  display_id: number | string | null;
  status: string;
  email: string | null;
  currency_code: string | null;
  vendor_total: number;
  created_at: string;
  items: VendorOrderItem[];
};

type VendorMeResponse = {
  vendor: Vendor;
  member: VendorMember;
  commerce: {
    currency_code: string;
  };
};

type ProductForm = {
  title: string;
  handle: string;
  status: VendorProduct["status"];
  description: string;
  thumbnail: string;
  price: string;
  currency_code: string;
  sku: string;
  variant_title: string;
  images: ProductImageForm[];
  variants: ProductVariantForm[];
};

type ProductImageForm = {
  id?: string;
  url: string;
};

type ProductVariantForm = {
  id?: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  sku: string;
};

type PasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};

type TabId = "home" | "products" | "orders" | "profile" | "security";

const emptyProductForm: ProductForm = {
  title: "",
  handle: "",
  status: "published",
  description: "",
  thumbnail: "",
  price: "",
  currency_code: "",
  sku: "",
  variant_title: "",
  images: [],
  variants: [{ size: "", color: "", price: "", stock: "", sku: "" }],
};

const emptyPasswordForm: PasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const defaultApiBase = () => {
  if (typeof window === "undefined" || !window.location.hostname) {
    return "http://localhost:9000";
  }

  return `${window.location.protocol}//${window.location.hostname}:9000`;
};

const API_BASE = (
  import.meta.env.VITE_MEDUSA_BACKEND_URL || defaultApiBase()
).replace(/\/$/, "");

const statusLabels: Record<VendorProduct["status"], string> = {
  draft: "مسودة",
  proposed: "مقترح",
  published: "منشور",
  rejected: "مرفوض",
};

const editableProductStatuses: VendorProduct["status"][] = [
  "published",
  "draft",
];

const orderStatusLabels: Record<string, string> = {
  pending: "قيد المعالجة",
  completed: "مكتمل",
  canceled: "ملغي",
  archived: "مؤرشف",
  requires_action: "يتطلب إجراء",
};

const navItems: {
  id: TabId;
  label: string;
  icon: string;
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
    label: "بيانات المتجر",
    icon: "M5 20V8l7-4 7 4v12M8 12h8M8 16h8",
  },
  {
    id: "security",
    label: "الأمان",
    icon: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6zM9.5 12l1.6 1.6L15 9.8",
  },
];

const tabCopy: Record<TabId, { title: string; description: string }> = {
  home: {
    title: "نظرة عامة",
    description: "ملخص سريع لمنتجات متجرك وطلباته الحالية.",
  },
  products: {
    title: "المنتجات",
    description: "إدارة المنتجات والنسخ والمخزون داخل متجرك.",
  },
  orders: {
    title: "الطلبات",
    description: "متابعة الطلبات المرتبطة بمتجرك فقط.",
  },
  profile: {
    title: "بيانات المتجر",
    description: "هوية متجرك والنطاقات المرتبطة به.",
  },
  security: {
    title: "الأمان",
    description: "إدارة كلمة مرور حساب البائع.",
  },
};

const uiIcons = {
  arrow: "M14 6l-6 6 6 6",
  email: "M4 6h16v12H4zM4 7l8 6 8-6",
  eye: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  lock: "M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v10H6z",
  logout: "M10 5H5v14h5M14 8l4 4-4 4m4-4H9",
  store: "M4 10h16l-2-5H6zM6 10v9h12v-9M9 19v-5h6v5",
};

const request = async <T,>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // Keep HTTP fallback.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getPrimaryVariant = (product: VendorProduct) => product.variants?.[0];

const getPrimaryPrice = (product: VendorProduct) =>
  getPrimaryVariant(product)?.prices?.[0];

const normalizeAmountValue = (amount: number | string | null | undefined) => {
  if (amount === null || amount === undefined || amount === "") {
    return "";
  }

  return String(amount);
};

const getVariantOption = (
  variant: VendorProductVariant,
  optionTitle: "Size" | "Color",
) =>
  variant.options?.find(
    (option) => option.option?.title?.toLowerCase() === optionTitle.toLowerCase(),
  )?.value;

const productToForm = (
  product: VendorProduct,
  storeCurrency: string,
): ProductForm => {
  const primaryVariant = getPrimaryVariant(product);
  const primaryPrice = getPrimaryPrice(product);
  const variants = product.variants?.length
      ? product.variants.map((variant) => {
        const [titleSize = "", titleColor = ""] = variant.title
          .split("/")
          .map((value) => value.trim());

        return {
          id: variant.id,
          size: getVariantOption(variant, "Size") ?? titleSize,
          color: getVariantOption(variant, "Color") ?? titleColor,
          price: normalizeAmountValue(variant.prices?.[0]?.amount),
          stock: variant.manage_inventory
            ? normalizeAmountValue(variant.inventory_quantity ?? 0)
            : "0",
          sku: variant.sku ?? "",
        };
      })
    : [{ size: "", color: "", price: "", stock: "", sku: "" }];

  return {
    title: product.title ?? "",
    handle: product.handle ?? "",
    status: editableProductStatuses.includes(product.status)
      ? product.status
      : "draft",
    description: product.description ?? "",
    thumbnail: product.thumbnail ?? "",
    price: normalizeAmountValue(primaryPrice?.amount),
    currency_code: storeCurrency,
    sku: primaryVariant?.sku ?? "",
    variant_title: primaryVariant?.title ?? product.title ?? "",
    images: (() => {
      const images: ProductImageForm[] = (product.images ?? []).map((image) => ({
        id: image.id,
        url: image.url,
      }));
      if (product.thumbnail && !images.some((image) => image.url === product.thumbnail)) {
        images.unshift({ url: product.thumbnail });
      }
      return images;
    })(),
    variants,
  };
};

const formatProductPrice = (product: VendorProduct) => {
  const price = getPrimaryPrice(product);

  if (!price || price.amount === null || price.amount === undefined) {
    return "بدون سعر";
  }

  return formatAmount(Number(price.amount), price.currency_code);
};

const formatInventoryMode = (product: VendorProduct) => {
  const variant = getPrimaryVariant(product);

  if (!variant) {
    return "بدون نسخة";
  }

  return variant.manage_inventory ? "متتبع" : "غير متتبع";
};

const formatAmount = (amount: number, currency: string | null) => {
  const formatted = Number.isFinite(Number(amount))
    ? Number(amount).toLocaleString("ar")
    : "0";

  return currency ? `${formatted} ${currency.toUpperCase()}` : formatted;
};

const formatDate = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ar", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

const vendorDemoMode =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("demo") === "1";

const vendorDemoSession: VendorMeResponse = {
  vendor: {
    id: "vendor-demo",
    name: "متجري الرياضي",
    handle: "sport",
    domains: ["store.labibtech.com/sport"],
    branding: { logo_url: null, primary_color: "#1687ff" },
  },
  member: {
    id: "member-demo",
    email: "owner@nawa.local",
    role: "owner",
    status: "active",
  },
  commerce: { currency_code: "lyd" },
};

const vendorDemoProducts: VendorProduct[] = [
  {
    id: "product-demo-1",
    title: "Ultra Pro Running Shoe",
    handle: "ultra-pro-running-shoe",
    status: "published",
    thumbnail: "/assets/products/ultra-pro-black.png",
    description: "A lightweight, comfortable running shoe designed for daily use and long distances.",
    images: [{ url: "/assets/products/ultra-pro-black.png" }],
    variants: [{
      id: "variant-demo-1-0",
      title: "42 / Black",
      sku: "SH-BLK-42",
      manage_inventory: true,
      inventory_quantity: 12,
      available_quantity: 12,
      options: [
        { value: "42", option: { title: "Size" } },
        { value: "Black", option: { title: "Color" } },
      ],
      prices: [{ amount: 299, currency_code: "lyd" }],
    }],
  },
  {
    id: "product-demo-2",
    title: "تيشيرت رياضي سريع الجفاف",
    handle: "quick-dry-tshirt",
    status: "published",
    thumbnail: "/assets/preview/vase.png",
    description: "تيشيرت رياضي خفيف وسريع الجفاف.",
    variants: [{
      id: "variant-demo-2",
      title: "M / أسود",
      sku: "TS-BLK-M",
      manage_inventory: true,
      inventory_quantity: 120,
      prices: [{ amount: 79, currency_code: "lyd" }],
    }],
  },
  {
    id: "product-demo-3",
    title: "شورت تدريب رجالي",
    handle: "training-short",
    status: "published",
    thumbnail: "/assets/preview/mug.png",
    description: "شورت تدريب عملي بقصة مريحة.",
    variants: [{
      id: "variant-demo-3",
      title: "L / أسود",
      sku: "SHORT-BLK-L",
      manage_inventory: true,
      inventory_quantity: 68,
      prices: [{ amount: 69, currency_code: "lyd" }],
    }],
  },
  {
    id: "product-demo-4",
    title: "زجاجة ماء رياضية 750 مل",
    handle: "sports-bottle-750ml",
    status: "published",
    thumbnail: "/assets/preview/cushion.png",
    description: "زجاجة رياضية متينة وسهلة الحمل.",
    variants: [{ id: "variant-demo-4", title: "750ml / أسود", sku: "BTL-BLK", manage_inventory: true, inventory_quantity: 96, prices: [{ amount: 49, currency_code: "lyd" }] }],
  },
  {
    id: "product-demo-5",
    title: "حقيبة ظهر رياضية 25 لتر",
    handle: "sport-backpack-25l",
    status: "draft",
    thumbnail: "/assets/preview/candle.png",
    description: "حقيبة ظهر واسعة للتدريب والتنقل.",
    variants: [{ id: "variant-demo-5", title: "25L / أسود", sku: "BAG-BLK-25", manage_inventory: true, inventory_quantity: 25, prices: [{ amount: 149, currency_code: "lyd" }] }],
  },
  {
    id: "product-demo-6",
    title: "جوارب رياضية قطنية",
    handle: "sport-cotton-socks",
    status: "published",
    thumbnail: "/assets/preview/vase.png",
    description: "جوارب رياضية مريحة للاستخدام اليومي.",
    variants: [{ id: "variant-demo-6", title: "One Size / أبيض", sku: "SOCK-WHT", manage_inventory: true, inventory_quantity: 150, prices: [{ amount: 29, currency_code: "lyd" }] }],
  },
];

const vendorDemoOrders: VendorOrder[] = [
  {
    id: "order-demo-1",
    display_id: 1042,
    status: "pending",
    email: "buyer@example.test",
    currency_code: "lyd",
    vendor_total: 230,
    created_at: "2026-08-05T08:00:00Z",
    items: [{
      id: "item-demo-1",
      title: "قميص كلاسيكي",
      quantity: 1,
      unit_price: 85,
      total: 85,
      product_id: "product-demo-1",
      variant_title: "أسود / M",
    }],
  },
  {
    id: "order-demo-2",
    display_id: 1041,
    status: "completed",
    email: "customer@example.test",
    currency_code: "lyd",
    vendor_total: 145,
    created_at: "2026-08-04T10:00:00Z",
    items: [{
      id: "item-demo-2",
      title: "حقيبة جلدية",
      quantity: 1,
      unit_price: 145,
      total: 145,
      product_id: "product-demo-2",
      variant_title: "بني",
    }],
  },
];

const Icon = ({ path }: { path: string }) => (
  <svg aria-hidden="true" className="icon" viewBox="0 0 24 24">
    <path d={path} />
  </svg>
);

const StatusPill = ({ status }: { status: VendorProduct["status"] }) => (
  <span className={`status-pill status-${status}`}>{statusLabels[status]}</span>
);

function LoginScreen({
  onLogin,
  isLoading,
  notice,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  notice: Notice | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onLogin(email, password);
  };

  return (
    <main className="vendor-signin-shell" dir="rtl">
      <aside className="merchant-brand-panel" aria-label="هوية LabibTech للبائعين">
        <div className="merchant-brand-copy">
          <img
            className="merchant-brand-logo"
            src="/assets/labibtech-logo.png"
            alt="LabibTech"
            width="1254"
            height="1254"
            draggable="false"
          />
          <div className="merchant-platform-label">
            <Storefront aria-hidden="true" size={23} weight="regular" />
            <span>لوحة البائع</span>
          </div>
          <h2>تدير متجرك بسهولة واحتراف</h2>
          <p>من المنتجات والمخزون إلى الطلبات والشحن،<br />كل ما تحتاجه لتشغيل متجرك بنجاح.</p>
        </div>
        <img
          className="merchant-core-art"
          src="/assets/merchant-commerce-core.png"
          alt="منظومة LabibTech لإدارة المتجر والمنتجات والمخزون والطلبات"
          width="1536"
          height="1536"
          draggable="false"
        />
      </aside>

      <section className="merchant-auth-region" aria-label="تسجيل دخول البائع">
        <article className="merchant-signin-card">
          <header className="merchant-signin-heading">
            <span className="merchant-signin-emblem">
              <Storefront aria-hidden="true" size={58} weight="regular" />
            </span>
            <h1>مرحباً بك في <span>لوحة متجرك</span></h1>
            <p>أدر منتجاتك وطلباتك ومخزونك من مكان واحد</p>
          </header>

          <form className="merchant-signin-form" onSubmit={submit}>
            <label htmlFor="merchant-email">البريد الإلكتروني</label>
            <div className="merchant-input-shell">
              <input
                id="merchant-email"
                autoComplete="email"
                dir="ltr"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                required
                type="email"
                value={email}
              />
              <EnvelopeSimple aria-hidden="true" size={31} weight="regular" />
            </div>

            <label htmlFor="merchant-password">كلمة المرور</label>
            <div className="merchant-input-shell">
              <input
                id="merchant-password"
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <LockKey aria-hidden="true" size={31} weight="regular" />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeSlash aria-hidden="true" size={31} weight="regular" />
                ) : (
                  <Eye aria-hidden="true" size={31} weight="regular" />
                )}
              </button>
            </div>

            <div className="signin-notice-slot" aria-live="polite">
              {notice ? <div className={`notice notice-${notice.tone}`}>{notice.text}</div> : null}
            </div>

            <button className="merchant-signin-button" disabled={isLoading} type="submit">
              <span>{isLoading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}</span>
              <ArrowLeft aria-hidden="true" size={34} weight="regular" />
            </button>
          </form>

          <footer className="merchant-signin-footer">
            <span className="merchant-footer-line" aria-hidden="true" />
            <div>
              <Headset aria-hidden="true" size={27} weight="regular" />
              <p>تحتاج إلى مساعدة؟ تواصل مع فريق <strong>LabibTech</strong></p>
            </div>
          </footer>
        </article>
      </section>
    </main>
  );
}

export function LegacyDashboard({
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
  vendor: Vendor;
  member: VendorMember;
  products: VendorProduct[];
  orders: VendorOrder[];
  selectedProduct: VendorProduct | null;
  productForm: ProductForm;
  passwordForm: PasswordForm;
  activeTab: TabId;
  isCreatingProduct: boolean;
  isSavingProduct: boolean;
  isSavingPassword: boolean;
  notice: Notice | null;
  onLogout: () => Promise<void>;
  onTabChange: (tab: TabId) => void;
  onStartCreateProduct: () => void;
  onCancelProductEdit: () => void;
  onSelectProduct: (product: VendorProduct) => void;
  onProductFormChange: (form: ProductForm) => void;
  onPasswordFormChange: (form: PasswordForm) => void;
  onSaveProduct: () => Promise<void>;
  onSavePassword: () => Promise<void>;
}) {
  const counts = useMemo(() => {
    const draft = products.filter(
      (product) => product.status === "draft",
    ).length;
    const published = products.filter(
      (product) => product.status === "published",
    ).length;

    return {
      assigned: products.length,
      draft,
      published,
      orders: orders.length,
    };
  }, [orders.length, products]);

  const domains = vendor.domains.length
    ? vendor.domains.join("، ")
    : "بدون نطاق";
  const canEditProduct = Boolean(selectedProduct || isCreatingProduct);
  const currentTab = tabCopy[activeTab];

  return (
    <main className="dashboard-shell" dir="rtl">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/assets/labibtech-logo.png" alt="LabibTech" width="1254" height="1254" />
          <span>لوحة البائع</span>
        </div>
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
        <div className="sidebar-footer">
          <span>مساحة المتجر</span>
          <strong>{vendor.name}</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="store-context">
            <span className="store-context__mark">{vendor.name.trim().slice(0, 1) || "م"}</span>
            <div>
              <strong>{vendor.name}</strong>
              <span dir="ltr">{domains}</span>
            </div>
          </div>
          <div className="account-actions">
            <div className="account-chip">
              <span>{member.role === "owner" ? "مالك المتجر" : "مدير المتجر"}</span>
              <strong dir="ltr">{member.email}</strong>
            </div>
            <button className="topbar-logout" onClick={onLogout} type="button">
              <Icon path={uiIcons.logout} />
              تسجيل الخروج
            </button>
          </div>
        </header>

        <div className="workspace-heading">
          <div>
            <h1>{currentTab.title}</h1>
            <p>{currentTab.description}</p>
          </div>
          {(activeTab === "home" || activeTab === "products") ? (
            <button className="primary-button workspace-primary-action" onClick={onStartCreateProduct} type="button">
              <span aria-hidden="true">＋</span>
              إنشاء منتج
            </button>
          ) : null}
        </div>

        {notice && (
          <div className={`notice notice-${notice.tone}`}>{notice.text}</div>
        )}

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
                  إضافة منتج
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
                          selectedProduct?.id === product.id
                            ? "selected-row"
                            : ""
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
                        const title = event.target.value;
                        onProductFormChange({
                          ...productForm,
                          title,
                          handle: productForm.handle || slugify(title),
                          variant_title: productForm.variant_title || title,
                        });
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
                  {isCreatingProduct ? (
                    <section className="variant-editor" aria-labelledby="variant-editor-title">
                      <div className="variant-editor__heading">
                        <div>
                          <h3 id="variant-editor-title">المقاسات والألوان</h3>
                          <p>أضف سعراً لكل تركيبة متاحة. العملة {productForm.currency_code.toUpperCase()}.</p>
                        </div>
                        <button
                          className="secondary-button"
                          disabled={productForm.variants.length >= 50}
                          onClick={() =>
                            onProductFormChange({
                              ...productForm,
                              variants: [
                                ...productForm.variants,
                                { size: "", color: "", price: "", stock: "", sku: "" },
                              ],
                            })
                          }
                          type="button"
                        >
                          إضافة نسخة
                        </button>
                      </div>
                      <div className="variant-editor__rows">
                        {productForm.variants.map((variant, index) => (
                          <div className="variant-row" key={index}>
                            {(["size", "color", "price", "stock", "sku"] as const).map((field) => (
                              <label key={field}>
                                {{ size: "المقاس", color: "اللون", price: "السعر", stock: "المخزون", sku: "SKU" }[field]}
                                <input
                                  dir={field === "color" ? undefined : "ltr"}
                                  inputMode={field === "price" ? "decimal" : field === "stock" ? "numeric" : undefined}
                                  min={field === "price" || field === "stock" ? "0" : undefined}
                                  onChange={(event) =>
                                    onProductFormChange({
                                      ...productForm,
                                      variants: productForm.variants.map((entry, entryIndex) =>
                                        entryIndex === index
                                          ? { ...entry, [field]: event.target.value }
                                          : entry,
                                      ),
                                    })
                                  }
                                  placeholder={{ size: "M", color: "أسود", price: "15", stock: "10", sku: "TS-M-BLK" }[field]}
                                  step={field === "stock" ? "1" : undefined}
                                  type={field === "price" || field === "stock" ? "number" : "text"}
                                  value={variant[field]}
                                />
                              </label>
                            ))}
                            <button
                              className="text-button variant-row__remove"
                              disabled={productForm.variants.length === 1}
                              onClick={() =>
                                onProductFormChange({
                                  ...productForm,
                                  variants: productForm.variants.filter((_, entryIndex) => entryIndex !== index),
                                })
                              }
                              type="button"
                            >
                              حذف
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : (
                    <>
                      <div className="form-row">
                        <label>
                          السعر
                          <input
                            dir="ltr"
                            inputMode="decimal"
                            min="0"
                            onChange={(event) =>
                              onProductFormChange({ ...productForm, price: event.target.value })
                            }
                            placeholder="15"
                            type="number"
                            value={productForm.price}
                          />
                        </label>
                        <label>
                          العملة
                          <input
                            aria-readonly="true"
                            dir="ltr"
                            readOnly
                            value={productForm.currency_code.toUpperCase()}
                          />
                        </label>
                      </div>
                      <div className="form-row">
                        <label>
                          رمز المنتج
                          <input
                            dir="ltr"
                            onChange={(event) =>
                              onProductFormChange({ ...productForm, sku: event.target.value })
                            }
                            placeholder="SKU-001"
                            value={productForm.sku}
                          />
                        </label>
                        <label>
                          اسم النسخة
                          <input
                            onChange={(event) =>
                              onProductFormChange({ ...productForm, variant_title: event.target.value })
                            }
                            placeholder={productForm.title || "Default"}
                            value={productForm.variant_title}
                          />
                        </label>
                      </div>
                    </>
                  )}
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
                          {formatAmount(
                            order.vendor_total,
                            order.currency_code,
                          )}
                        </strong>
                      </div>
                    </div>
                    <div className="line-items">
                      {order.items.map((item) => (
                        <div key={item.id}>
                          <span>{item.title}</span>
                          <span>
                            {item.quantity} ×{" "}
                            {formatAmount(
                              item.unit_price ?? 0,
                              order.currency_code,
                            )}
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
                <h2>بيانات المتجر</h2>
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
                      backgroundColor:
                        vendor.branding.primary_color || "#14b8a6",
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
                <h2>الأمان</h2>
                <p>غيّر كلمة مرور حسابك من داخل لوحة البائع.</p>
              </div>
            </div>
            <form
              className="security-form"
              onSubmit={(event) => {
                event.preventDefault();
                void onSavePassword();
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
  );
}

export default function App() {
  const [me, setMe] = useState<VendorMeResponse | null>(
    vendorDemoMode ? vendorDemoSession : null,
  );
  const [products, setProducts] = useState<VendorProduct[]>(
    vendorDemoMode ? vendorDemoProducts : [],
  );
  const [orders, setOrders] = useState<VendorOrder[]>(
    vendorDemoMode ? vendorDemoOrders : [],
  );
  const [selectedProduct, setSelectedProduct] = useState<VendorProduct | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(
    vendorDemoMode
      ? {
          ...emptyProductForm,
          currency_code: vendorDemoSession.commerce.currency_code,
        }
      : emptyProductForm,
  );
  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(emptyPasswordForm);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingProductImages, setIsUploadingProductImages] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadVendor = async () => {
    const [vendorMe, productData, orderData] = await Promise.all([
      request<VendorMeResponse>("/vendor/me"),
      request<{ products: VendorProduct[]; count: number }>("/vendor/products"),
      request<{ orders: VendorOrder[]; count: number }>("/vendor/orders").catch(
        () => ({ orders: [], count: 0 }),
      ),
    ]);

    setMe(vendorMe);
    setProducts(productData.products);
    setOrders(orderData.orders);

    setSelectedProduct(null);
    setProductForm({
      ...emptyProductForm,
      currency_code: vendorMe.commerce.currency_code,
    });
    setIsCreatingProduct(false);
  };

  useEffect(() => {
    if (vendorDemoMode) {
      setIsLoading(false);
      return;
    }

    loadVendor()
      .catch(() => {
        setMe(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoggingIn(true);
    setNotice(null);

    try {
      await request<VendorMeResponse>("/vendor/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      await loadVendor();
      setNotice({ tone: "success", text: "تم تسجيل الدخول بنجاح." });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "تعذر تسجيل الدخول إلى لوحة البائع.",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await request("/vendor/auth/logout", { method: "POST" }).catch(() => null);
    setMe(null);
    setProducts([]);
    setOrders([]);
    setSelectedProduct(null);
    setProductForm(emptyProductForm);
    setPasswordForm(emptyPasswordForm);
    setActiveTab("home");
    setNotice({ tone: "info", text: "تم تسجيل الخروج." });
  };

  const selectProduct = (product: VendorProduct) => {
    setActiveTab("products");
    setIsCreatingProduct(false);
    setSelectedProduct(product);
    setProductForm(productToForm(product, me?.commerce.currency_code ?? ""));
  };

  const startCreateProduct = () => {
    setActiveTab("products");
    setIsCreatingProduct(true);
    setSelectedProduct(null);
    setProductForm({
      ...emptyProductForm,
      currency_code: me?.commerce.currency_code ?? "",
    });
  };

  const cancelProductEdit = () => {
    setIsCreatingProduct(false);
    setSelectedProduct(null);
    setProductForm({
      ...emptyProductForm,
      currency_code: me?.commerce.currency_code ?? "",
    });
  };

  const saveProduct = async () => {
    if (!isCreatingProduct && !selectedProduct) {
      return;
    }

    setIsSavingProduct(true);
    setNotice(null);

    try {
      if (
        productForm.variants.length < 1 ||
        productForm.variants.some(
          (variant) =>
            !variant.size.trim() ||
            !variant.color.trim() ||
            !variant.price.trim() ||
            !variant.stock.trim(),
        )
      ) {
        setNotice({
          tone: "error",
          text: "Size, color, price and stock are required for every variant.",
        });
        return;
      }

      const payload: Record<string, unknown> = {
        title: productForm.title,
        handle: productForm.handle,
        status: productForm.status,
        description: productForm.description,
        thumbnail: productForm.images[0]?.url || productForm.thumbnail,
        images: productForm.images
          .filter((image) => image.url.trim())
          .map((image) => ({ id: image.id, url: image.url.trim() })),
        variants: productForm.variants.map((variant) => ({
          id: variant.id,
          size: variant.size,
          color: variant.color,
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku,
        })),
      };

      if (!payload.thumbnail) {
        payload.thumbnail = null;
      }

      if (vendorDemoMode) {
        const productId = selectedProduct?.id ?? `product-demo-${Date.now()}`;
        const product: VendorProduct = {
          id: productId,
          title: productForm.title,
          handle: productForm.handle,
          status: productForm.status,
          description: productForm.description,
          thumbnail: productForm.images[0]?.url || null,
          images: productForm.images.filter((image) => image.url.trim()),
          variants: productForm.variants.map((variant, index) => ({
            id: variant.id ?? `variant-demo-${Date.now()}-${index}`,
            title: `${variant.size.trim()} / ${variant.color.trim()}`,
            sku: variant.sku.trim() || null,
            manage_inventory: true,
            allow_backorder: false,
            inventory_quantity: Number(variant.stock),
            available_quantity: Number(variant.stock),
            options: [
              { value: variant.size.trim(), option: { title: "Size" } },
              { value: variant.color.trim(), option: { title: "Color" } },
            ],
            prices: [
              {
                amount: variant.price,
                currency_code: productForm.currency_code || "lyd",
              },
            ],
          })),
        };

        setProducts((current) =>
          isCreatingProduct
            ? [product, ...current]
            : current.map((entry) => (entry.id === product.id ? product : entry)),
        );
        setSelectedProduct(product);
        setProductForm(productToForm(product, productForm.currency_code));
        setIsCreatingProduct(false);
        setNotice({
          tone: "success",
          text: isCreatingProduct ? "Product created." : "Product saved.",
        });
        return;
      }

      const data = await request<{ product: VendorProduct }>(
        isCreatingProduct
          ? "/vendor/products"
          : `/vendor/products/${selectedProduct?.id}`,
        {
          method: isCreatingProduct ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setProducts((current) =>
        isCreatingProduct
          ? [data.product, ...current]
          : current.map((product) =>
              product.id === data.product.id ? data.product : product,
            ),
      );
      setSelectedProduct(data.product);
      setProductForm(
        productToForm(data.product, me?.commerce.currency_code ?? ""),
      );
      setIsCreatingProduct(false);
      setNotice({
        tone: "success",
        text: isCreatingProduct ? "Product created." : "Product saved.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error ? error.message : "The product could not be saved.",
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const uploadProductImages = async (files: File[]) => {
    if (!files.length) {
      return;
    }

    if (productForm.images.length + files.length > 12) {
      setNotice({ tone: "error", text: "A product can have up to 12 images." });
      return;
    }

    setIsUploadingProductImages(true);
    setNotice(null);

    try {
      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (files.some((file) => !allowedTypes.has(file.type) || file.size > 4 * 1024 * 1024)) {
        throw new Error("Use JPG, PNG or WebP images no larger than 4 MB each.");
      }

      if (vendorDemoMode) {
        const uploaded = files.map((file) => ({ url: URL.createObjectURL(file) }));
        setProductForm((current) => ({
          ...current,
          images: [...current.images, ...uploaded],
        }));
        return;
      }

      const encodedFiles = await Promise.all(
        files.map(
          (file) =>
            new Promise<{ filename: string; mime_type: string; content: string }>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error("The image file could not be read."));
                reader.onload = () => {
                  const result = typeof reader.result === "string" ? reader.result : "";
                  const content = result.includes(",") ? result.slice(result.indexOf(",") + 1) : "";
                  if (!content) {
                    reject(new Error("The image file could not be read."));
                    return;
                  }
                  resolve({
                    filename: file.name,
                    mime_type: file.type,
                    content,
                  });
                };
                reader.readAsDataURL(file);
              },
            ),
        ),
      );
      const data = await request<{ files: ProductImageForm[] }>("/vendor/uploads", {
        method: "POST",
        body: JSON.stringify({ files: encodedFiles }),
      });
      setProductForm((current) => ({
        ...current,
        images: [...current.images, ...data.files],
      }));
      setNotice({ tone: "success", text: "Product images uploaded." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Product images could not be uploaded.",
      });
    } finally {
      setIsUploadingProductImages(false);
    }
  };

  const deleteProduct = async (product: VendorProduct) => {
    setNotice(null);

    try {
      if (!vendorDemoMode) {
        await request(`/vendor/products/${product.id}`, { method: "DELETE" });
      }

      setProducts((current) => current.filter((entry) => entry.id !== product.id));
      setSelectedProduct(null);
      setIsCreatingProduct(false);
      setProductForm({
        ...emptyProductForm,
        currency_code: me?.commerce.currency_code ?? "",
      });
      setNotice({ tone: "success", text: "Product deleted." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The product could not be deleted.",
      });
    }
  };

  const savePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setNotice({
        tone: "error",
        text: "تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.",
      });
      return;
    }

    setIsSavingPassword(true);
    setNotice(null);

    try {
      await request<{ success: boolean }>("/vendor/auth/password", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });
      setPasswordForm(emptyPasswordForm);
      setNotice({ tone: "success", text: "تم تغيير كلمة المرور." });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error ? error.message : "تعذر تغيير كلمة المرور.",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <main className="loading-screen" dir="rtl">
        <div className="loader" />
        <span>جار تحميل لوحة البائع...</span>
      </main>
    );
  }

  if (!me) {
    return (
      <LoginScreen isLoading={isLoggingIn} notice={notice} onLogin={login} />
    );
  }

  return (
    <MerchantDashboard
      activeTab={activeTab}
      isDemo={vendorDemoMode}
      isCreatingProduct={isCreatingProduct}
      isSavingPassword={isSavingPassword}
      isSavingProduct={isSavingProduct}
      isUploadingProductImages={isUploadingProductImages}
      member={me.member}
      notice={notice}
      onCancelProductEdit={cancelProductEdit}
      onLogout={logout}
      onPasswordFormChange={setPasswordForm}
      onProductFormChange={setProductForm}
      onSavePassword={savePassword}
      onSaveProduct={saveProduct}
      onDeleteProduct={deleteProduct}
      onSelectProduct={selectProduct}
      onStartCreateProduct={startCreateProduct}
      onUploadProductImages={uploadProductImages}
      onTabChange={setActiveTab}
      orders={orders}
      passwordForm={passwordForm}
      productForm={productForm}
      products={products}
      selectedProduct={selectedProduct}
      vendor={me.vendor}
    />
  );
}
