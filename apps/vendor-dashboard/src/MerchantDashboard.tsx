import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  Eye,
  FloppyDisk,
  FunnelSimple,
  Handbag,
  House,
  LinkSimple,
  List,
  MagnifyingGlass,
  Moon,
  Package,
  PencilSimple,
  Plus,
  Question,
  ShieldCheck,
  SignOut,
  Storefront,
  Sun,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";

import "./merchant-dashboard.css";
import { VendorDashboardHome } from "./VendorDashboardHome";
import { VendorDashboardSections } from "./VendorDashboardSections";
import { VendorProductEditor } from "./VendorProductEditor";

type DashboardTab = "home" | "products" | "orders" | "profile" | "security";
type DashboardTheme = "dark" | "light";
type ProductStatus = "draft" | "proposed" | "published" | "rejected";

const DASHBOARD_THEME_STORAGE_KEY = "labibtech-vendor-theme";

type MerchantVendor = {
  name: string;
  handle: string;
  domains: string[];
  branding: {
    logo_url: string | null;
    primary_color: string | null;
  };
};

type MerchantMember = {
  email: string;
  role: "owner" | "manager";
};

type MerchantProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  manage_inventory: boolean;
  inventory_quantity?: number | null;
  available_quantity?: number | null;
  options?: Array<{
    value: string;
    option?: { title?: string };
  }>;
  prices?: Array<{
    amount: number | string | null;
    currency_code: string | null;
  }>;
};

type MerchantProduct = {
  id: string;
  title: string;
  handle: string;
  status: ProductStatus;
  thumbnail: string | null;
  description?: string | null;
  images?: Array<{ id?: string; url: string; rank?: number | null }>;
  variants?: MerchantProductVariant[];
};

type MerchantOrder = {
  id: string;
  display_id: number | string | null;
  status: string;
  email: string | null;
  currency_code: string | null;
  vendor_total: number;
  created_at: string;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
  }>;
};

type ProductVariantForm = {
  id?: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  sku: string;
};

type ProductImageForm = {
  id?: string;
  url: string;
};

type MerchantProductForm = {
  title: string;
  handle: string;
  status: ProductStatus;
  description: string;
  thumbnail: string;
  price: string;
  currency_code: string;
  sku: string;
  variant_title: string;
  images: ProductImageForm[];
  variants: ProductVariantForm[];
};

type MerchantPasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type MerchantNotice = {
  tone: "success" | "error" | "info";
  text: string;
};

export type MerchantDashboardProps = {
  isDemo: boolean;
  vendor: MerchantVendor;
  member: MerchantMember;
  products: MerchantProduct[];
  orders: MerchantOrder[];
  selectedProduct: MerchantProduct | null;
  productForm: MerchantProductForm;
  passwordForm: MerchantPasswordForm;
  activeTab: DashboardTab;
  isCreatingProduct: boolean;
  isSavingProduct: boolean;
  isUploadingProductImages: boolean;
  isSavingPassword: boolean;
  notice: MerchantNotice | null;
  onLogout: () => Promise<void>;
  onTabChange: (tab: DashboardTab) => void;
  onStartCreateProduct: () => void;
  onCancelProductEdit: () => void;
  onSelectProduct: (product: MerchantProduct) => void;
  onDeleteProduct: (product: MerchantProduct) => Promise<void>;
  onUploadProductImages: (files: File[]) => Promise<void>;
  onProductFormChange: (form: MerchantProductForm) => void;
  onPasswordFormChange: (form: MerchantPasswordForm) => void;
  onSaveProduct: () => Promise<void>;
  onSavePassword: () => Promise<void>;
};

const statusLabels: Record<ProductStatus, string> = {
  draft: "مسودة",
  proposed: "مقترح",
  published: "منشور",
  rejected: "مرفوض",
};

const navigation: Array<{
  id: DashboardTab;
  label: string;
  icon: typeof House;
}> = [
  { id: "home", label: "الرئيسية", icon: House },
  { id: "products", label: "المنتجات", icon: Storefront },
  { id: "orders", label: "الطلبات", icon: Handbag },
  { id: "profile", label: "بيانات المتجر", icon: Package },
  { id: "security", label: "الأمان", icon: ShieldCheck },
];

const fallbackProductImages = [
  "/assets/preview/candle.png",
  "/assets/preview/vase.png",
  "/assets/preview/mug.png",
  "/assets/preview/cushion.png",
];

const primaryPrice = (product: MerchantProduct) =>
  product.variants?.[0]?.prices?.[0];

const formatPrice = (product: MerchantProduct) => {
  const price = primaryPrice(product);

  if (price?.amount === null || price?.amount === undefined) {
    return "بدون سعر";
  }

  return `${Number(price.amount).toLocaleString("ar")} ${(price.currency_code || "LYD").toUpperCase()}`;
};

const formatMoney = (amount: number, currency: string | null) =>
  `${Number(amount).toLocaleString("ar")} ${(currency || "LYD").toUpperCase()}`;

function BrandLogo() {
  return (
    <div className="merchant-v2__brand-lockup" aria-label="LabibTech">
      <span className="merchant-v2__brand-mark" aria-hidden="true">
        <img
          alt=""
          className="merchant-v2__brand-logo"
          height="1254"
          src="/assets/labibtech-logo.png"
          width="1254"
        />
      </span>
      <strong>Labib<span>Tech</span></strong>
    </div>
  );
}

function StoreBadge() {
  return (
    <span className="merchant-v2__store-badge" aria-hidden="true">
      <Storefront size={28} weight="duotone" />
    </span>
  );
}

function MerchantSidebar({
  activeTab,
  collapsed,
  onCollapse,
  onTabChange,
}: {
  activeTab: DashboardTab;
  collapsed: boolean;
  onCollapse: () => void;
  onTabChange: (tab: DashboardTab) => void;
}) {
  return (
    <aside className="merchant-v2__sidebar" aria-label="التنقل الرئيسي">
      <div className="merchant-v2__sidebar-brand">
        <BrandLogo />
      </div>

      <nav className="merchant-v2__navigation">
        {navigation.map((item) => {
          const NavigationIcon = item.icon;
          return (
            <button
              aria-current={activeTab === item.id ? "page" : undefined}
              className={`merchant-v2__nav-item ${
                activeTab === item.id ? "is-active" : ""
              }`}
              key={item.id}
              onClick={() => onTabChange(item.id)}
              type="button"
            >
              <NavigationIcon size={25} weight="regular" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        aria-expanded={!collapsed}
        className="merchant-v2__collapse"
        onClick={onCollapse}
        type="button"
      >
        <CaretLeft size={20} />
        <span>طي القائمة</span>
      </button>
    </aside>
  );
}

function MerchantTopbar({
  member,
  onToggleTheme,
  vendor,
  onLogout,
  theme,
}: {
  member: MerchantMember;
  onToggleTheme: () => void;
  vendor: MerchantVendor;
  onLogout: () => Promise<void>;
  theme: DashboardTheme;
}) {
  const domain = vendor.domains[0] || `${vendor.handle}.labibtech.store`;

  return (
    <header className="merchant-v2__topbar">
      <div className="merchant-v2__store-context">
        <button className="merchant-v2__icon-button" type="button" aria-label="فتح القائمة">
          <List size={24} />
        </button>
        <StoreBadge />
        <div>
          <strong>{vendor.name}</strong>
          <span>
            الرابط: <bdi dir="ltr">{domain}</bdi>
            <LinkSimple size={14} weight="bold" />
          </span>
        </div>
      </div>

      <div className="merchant-v2__account-tools">
        <button
          aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
          className="merchant-v2__theme-toggle"
          onClick={onToggleTheme}
          title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          type="button"
        >
          {theme === "dark" ? <Sun size={21} weight="bold" /> : <Moon size={21} weight="bold" />}
        </button>
        <div className="merchant-v2__account">
          <span className="merchant-v2__avatar" aria-hidden="true">
            {member.email.trim().slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{member.email.split("@")[0]}</strong>
            <span>{member.role === "owner" ? "مالك المتجر" : "مدير المتجر"}</span>
          </div>
          <CaretDown size={16} />
        </div>
        <button className="merchant-v2__text-action" type="button">
          <Question size={22} />
          <span>مركز المساعدة</span>
        </button>
        <button
          className="merchant-v2__text-action"
          onClick={() => void onLogout()}
          type="button"
        >
          <SignOut size={23} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </header>
  );
}

function MetricCard({
  icon: MetricIcon,
  label,
  value,
}: {
  icon: typeof Storefront;
  label: string;
  value: number;
}) {
  return (
    <article className="merchant-v2__metric">
      <span className="merchant-v2__metric-icon">
        <MetricIcon size={29} weight="duotone" />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value.toLocaleString("ar")}</strong>
      </div>
    </article>
  );
}

function ProductStatus({ status }: { status: ProductStatus }) {
  return (
    <span className={`merchant-v2__status merchant-v2__status--${status}`}>
      <i aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function ProductsTable({
  products,
  selectedProduct,
  onSelectProduct,
  onRequestDelete,
}: {
  products: MerchantProduct[];
  selectedProduct: MerchantProduct | null;
  onSelectProduct: (product: MerchantProduct) => void;
  onRequestDelete: (product: MerchantProduct) => void;
}) {
  return (
    <div className="merchant-v2__table-shell">
      <div className="merchant-v2__table-scroll">
        <table className="merchant-v2__products-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الحالة</th>
              <th>السعر</th>
              <th>المتغيرات</th>
              <th>المخزون</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="merchant-v2__empty">لا توجد منتجات مطابقة.</div>
                </td>
              </tr>
            ) : null}
            {products.map((product, index) => {
              const variantCount = product.variants?.length || 0;
              return (
                <tr
                  className={selectedProduct?.id === product.id ? "is-selected" : ""}
                  key={product.id}
                >
                  <td>
                    <button
                      className="merchant-v2__product-cell"
                      onClick={() => onSelectProduct(product)}
                      type="button"
                    >
                      <img
                        alt=""
                        src={product.thumbnail || fallbackProductImages[index % fallbackProductImages.length]}
                      />
                      <span>
                        <strong>{product.title}</strong>
                        <bdi dir="ltr">{product.handle}</bdi>
                      </span>
                    </button>
                  </td>
                  <td><ProductStatus status={product.status} /></td>
                  <td className="merchant-v2__price">{formatPrice(product)}</td>
                  <td>{variantCount || "—"}</td>
                  <td>{product.variants?.some((variant) => variant.manage_inventory) ? "متتبع" : "—"}</td>
                  <td>
                    <div className="merchant-v2__row-actions">
                      <button
                        aria-label={`فتح ${product.title}`}
                        onClick={() => onSelectProduct(product)}
                        type="button"
                      >
                        <Eye size={21} />
                      </button>
                      <button
                        aria-label={`تعديل ${product.title}`}
                        onClick={() => onSelectProduct(product)}
                        type="button"
                      >
                        <PencilSimple size={21} />
                      </button>
                      <button
                        aria-label={`حذف ${product.title}`}
                        className="merchant-v2__danger-icon"
                        onClick={() => onRequestDelete(product)}
                        type="button"
                      >
                        <Trash size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="merchant-v2__table-footer">
        <label>
          <span>لكل صفحة</span>
          <select defaultValue="12" aria-label="عدد المنتجات لكل صفحة">
            <option value="12">12</option>
            <option value="24">24</option>
          </select>
        </label>
        <span>عرض 1 - {products.length} من {products.length} منتج</span>
        <div className="merchant-v2__pagination">
          <button type="button" aria-label="الصفحة السابقة"><CaretRight size={17} /></button>
          <button className="is-current" type="button">1</button>
          <button type="button">2</button>
          <button type="button">3</button>
          <button type="button" aria-label="الصفحة التالية"><CaretLeft size={17} /></button>
        </div>
      </footer>
    </div>
  );
}

function ProductVariantsEditor({
  form,
  onChange,
}: {
  form: MerchantProductForm;
  onChange: (form: MerchantProductForm) => void;
}) {
  const updateVariant = (
    index: number,
    field: keyof ProductVariantForm,
    value: string,
  ) => {
    onChange({
      ...form,
      variants: form.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    });
  };

  const removeVariant = (index: number) => {
    if (form.variants.length === 1) {
      return;
    }
    onChange({
      ...form,
      variants: form.variants.filter((_, variantIndex) => variantIndex !== index),
    });
  };

  return (
    <section className="merchant-v2__detail-card merchant-v2__detail-card--variants">
      <div className="merchant-v2__detail-card-heading">
        <div>
          <h2>المتغيرات والمخزون</h2>
          <p>أضف المقاسات والألوان وحدد سعر ومخزون كل نسخة.</p>
        </div>
        <button
          className="merchant-v2__secondary-action"
          disabled={form.variants.length >= 50}
          onClick={() =>
            onChange({
              ...form,
              variants: [
                ...form.variants,
                { size: "", color: "", price: "", stock: "", sku: "" },
              ],
            })
          }
          type="button"
        >
          <Plus size={18} /> إضافة نسخة
        </button>
      </div>

      <div className="merchant-v2__detail-variants-scroll">
        <div className="merchant-v2__detail-variants">
          <div className="merchant-v2__detail-variant-labels" aria-hidden="true">
            <span>المقاس</span>
            <span>اللون</span>
            <span>SKU</span>
            <span>السعر ({form.currency_code.toUpperCase() || "LYD"})</span>
            <span>المخزون</span>
            <span />
          </div>
          {form.variants.map((variant, index) => (
            <div className="merchant-v2__detail-variant-row" key={variant.id ?? `new-${index}`}>
              <input
                aria-label={`مقاس النسخة ${index + 1}`}
                onChange={(event) => updateVariant(index, "size", event.target.value)}
                placeholder="مثال: 42"
                value={variant.size}
              />
              <input
                aria-label={`لون النسخة ${index + 1}`}
                onChange={(event) => updateVariant(index, "color", event.target.value)}
                placeholder="مثال: أسود"
                value={variant.color}
              />
              <input
                aria-label={`رمز النسخة ${index + 1}`}
                dir="ltr"
                onChange={(event) => updateVariant(index, "sku", event.target.value)}
                placeholder="SKU-001"
                value={variant.sku}
              />
              <input
                aria-label={`سعر النسخة ${index + 1}`}
                inputMode="decimal"
                min="0"
                onChange={(event) => updateVariant(index, "price", event.target.value)}
                placeholder="0"
                type="number"
                value={variant.price}
              />
              <input
                aria-label={`مخزون النسخة ${index + 1}`}
                inputMode="numeric"
                min="0"
                onChange={(event) => updateVariant(index, "stock", event.target.value)}
                placeholder="0"
                type="number"
                value={variant.stock}
              />
              <button
                aria-label={`حذف النسخة ${index + 1}`}
                className="merchant-v2__variant-delete"
                disabled={form.variants.length === 1}
                onClick={() => removeVariant(index)}
                type="button"
              >
                <Trash size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductMediaEditor({
  form,
  isUploading,
  onChange,
  onUpload,
}: {
  form: MerchantProductForm;
  isUploading: boolean;
  onChange: (form: MerchantProductForm) => void;
  onUpload: (files: File[]) => Promise<void>;
}) {
  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= form.images.length) {
      return;
    }
    const images = [...form.images];
    [images[index], images[target]] = [images[target], images[index]];
    onChange({ ...form, images });
  };

  return (
    <section className="merchant-v2__detail-card">
      <div className="merchant-v2__detail-card-heading">
        <div>
          <h2>صور المنتج</h2>
          <p>الصورة الأولى هي صورة الغلاف. يمكنك رفع عدة صور أو إضافة رابط مباشر.</p>
        </div>
        <label className={`merchant-v2__upload-action ${isUploading ? "is-disabled" : ""}`}>
          <UploadSimple size={19} />
          {isUploading ? "جار الرفع..." : "رفع صور"}
          <input
            accept="image/jpeg,image/png,image/webp"
            disabled={isUploading}
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              void onUpload(files);
            }}
            type="file"
          />
        </label>
      </div>

      <div className="merchant-v2__media-grid">
        {form.images.map((image, index) => (
          <article className="merchant-v2__media-item" key={image.id ?? `image-${index}`}>
            <div className="merchant-v2__media-preview">
              {image.url ? <img alt="" src={image.url} /> : <span>أضف رابط الصورة</span>}
              {index === 0 ? <b>صورة الغلاف</b> : null}
            </div>
            <input
              aria-label={`رابط الصورة ${index + 1}`}
              dir="ltr"
              onChange={(event) =>
                onChange({
                  ...form,
                  images: form.images.map((entry, imageIndex) =>
                    imageIndex === index ? { ...entry, url: event.target.value } : entry,
                  ),
                })
              }
              placeholder="https://..."
              value={image.url}
            />
            <div className="merchant-v2__media-actions">
              <button disabled={index === 0} onClick={() => moveImage(index, -1)} type="button" aria-label="تحريك الصورة للأعلى"><ArrowUp size={17} /></button>
              <button disabled={index === form.images.length - 1} onClick={() => moveImage(index, 1)} type="button" aria-label="تحريك الصورة للأسفل"><ArrowDown size={17} /></button>
              <button
                className="merchant-v2__danger-icon"
                onClick={() => onChange({ ...form, images: form.images.filter((_, imageIndex) => imageIndex !== index) })}
                type="button"
                aria-label="حذف الصورة"
              >
                <Trash size={17} />
              </button>
            </div>
          </article>
        ))}
        {form.images.length < 12 ? (
          <button
            className="merchant-v2__add-media"
            onClick={() => onChange({ ...form, images: [...form.images, { url: "" }] })}
            type="button"
          >
            <Plus size={24} />
            إضافة رابط صورة
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ProductWorkspace({
  form,
  isCreatingProduct,
  isSavingProduct,
  isUploadingProductImages,
  onBack,
  onChange,
  onRequestDelete,
  onSave,
  onUpload,
  product,
}: {
  form: MerchantProductForm;
  isCreatingProduct: boolean;
  isSavingProduct: boolean;
  isUploadingProductImages: boolean;
  onBack: () => void;
  onChange: (form: MerchantProductForm) => void;
  onRequestDelete: (product: MerchantProduct) => void;
  onSave: () => Promise<void>;
  onUpload: (files: File[]) => Promise<void>;
  product: MerchantProduct | null;
}) {
  return (
    <form
      className="merchant-v2__product-workspace"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <fieldset disabled={isSavingProduct}>
        <header className="merchant-v2__workspace-header">
          <div className="merchant-v2__workspace-title">
            <button onClick={onBack} type="button"><ArrowRight size={20} /> العودة للمنتجات</button>
            <div>
              <h1>{isCreatingProduct ? "إنشاء منتج جديد" : form.title || "تفاصيل المنتج"}</h1>
              <p>{isCreatingProduct ? "أضف بيانات المنتج وصوره ومتغيراته قبل النشر." : `/${form.handle}`}</p>
            </div>
          </div>
          <div className="merchant-v2__workspace-actions">
            {!isCreatingProduct && product ? (
              <button className="merchant-v2__delete-button" onClick={() => onRequestDelete(product)} type="button"><Trash size={18} /> حذف المنتج</button>
            ) : null}
            <button className="merchant-v2__save-button merchant-v2__workspace-save" type="submit"><FloppyDisk size={19} /> {isSavingProduct ? "جار الحفظ..." : isCreatingProduct ? "إنشاء المنتج" : "حفظ التغييرات"}</button>
          </div>
        </header>

        <div className="merchant-v2__workspace-grid">
          <section className="merchant-v2__detail-card merchant-v2__detail-card--general">
            <div className="merchant-v2__detail-card-heading">
              <div><h2>المعلومات الأساسية</h2><p>البيانات التي تظهر للعميل داخل المتجر.</p></div>
              <ProductStatus status={form.status} />
            </div>
            <div className="merchant-v2__general-fields">
              <label><span>اسم المنتج</span><input required value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} /></label>
              <label><span>الرابط المختصر</span><input required dir="ltr" value={form.handle} onChange={(event) => onChange({ ...form, handle: event.target.value })} /></label>
              <label><span>حالة العرض</span><select value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as ProductStatus })}><option value="published">منشور</option><option value="draft">مسودة</option></select></label>
              <label className="merchant-v2__description-field"><span>الوصف</span><textarea rows={5} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} /></label>
            </div>
          </section>

          <ProductMediaEditor form={form} isUploading={isUploadingProductImages} onChange={onChange} onUpload={onUpload} />
          <ProductVariantsEditor form={form} onChange={onChange} />
        </div>
      </fieldset>
    </form>
  );
}

function ProductsScreen({
  products,
  selectedProduct,
  onSelectProduct,
  onStartCreateProduct,
  onRequestDelete,
}: {
  products: MerchantProduct[];
  selectedProduct: MerchantProduct | null;
  onSelectProduct: (product: MerchantProduct) => void;
  onStartCreateProduct: () => void;
  onRequestDelete: (product: MerchantProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProductStatus>("all");
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar");
    return products.filter((product) => {
      const matchesStatus = status === "all" || product.status === status;
      const matchesQuery =
        !normalizedQuery ||
        product.title.toLocaleLowerCase("ar").includes(normalizedQuery) ||
        product.handle.toLocaleLowerCase("en").includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [products, query, status]);
  const published = products.filter((product) => product.status === "published").length;

  return (
    <section className="merchant-v2__products-screen">
      <header className="merchant-v2__page-heading">
        <div>
          <h1>المنتجات</h1>
          <p>إدارة المنتجات والنسخ والمخزون داخل متجرك</p>
        </div>
        <button className="merchant-v2__create-button" onClick={onStartCreateProduct} type="button">
          <Plus size={21} />
          إنشاء منتج
        </button>
      </header>

      <div className="merchant-v2__metrics">
        <MetricCard icon={Storefront} label="إجمالي المنتجات" value={products.length} />
        <MetricCard icon={Handbag} label="المنتجات المنشورة" value={published} />
        <MetricCard icon={Eye} label="الطلبات الظاهرة" value={products.length ? Math.max(products.length * 2, 1) : 0} />
      </div>

      <div className="merchant-v2__filters">
        <label className="merchant-v2__search">
          <MagnifyingGlass size={20} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث عن منتج..."
            value={query}
          />
        </label>
        <label className="merchant-v2__filter-select">
          <select
            aria-label="تصفية حسب الحالة"
            onChange={(event) => setStatus(event.target.value as "all" | ProductStatus)}
            value={status}
          >
            <option value="all">كل الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
          </select>
          <CaretDown size={17} />
        </label>
        <button className="merchant-v2__filter-button" type="button">
          <FunnelSimple size={21} />
          تصفية
        </button>
      </div>

      <ProductsTable
        onSelectProduct={onSelectProduct}
        onRequestDelete={onRequestDelete}
        products={filteredProducts}
        selectedProduct={selectedProduct}
      />
    </section>
  );
}

function HomeScreen({ products, orders }: { products: MerchantProduct[]; orders: MerchantOrder[] }) {
  const published = products.filter((product) => product.status === "published").length;
  return (
    <section className="merchant-v2__simple-screen">
      <header><h1>الرئيسية</h1><p>ملخص سريع لأداء متجرك اليوم</p></header>
      <div className="merchant-v2__metrics merchant-v2__metrics--home">
        <MetricCard icon={Storefront} label="إجمالي المنتجات" value={products.length} />
        <MetricCard icon={Package} label="المنتجات المنشورة" value={published} />
        <MetricCard icon={Handbag} label="إجمالي الطلبات" value={orders.length} />
      </div>
    </section>
  );
}

function OrdersScreen({ orders }: { orders: MerchantOrder[] }) {
  return (
    <section className="merchant-v2__simple-screen">
      <header><h1>الطلبات</h1><p>متابعة الطلبات الخاصة بمتجرك فقط</p></header>
      <div className="merchant-v2__order-list">
        {orders.length ? orders.map((order) => (
          <article key={order.id}>
            <div><strong>طلب #{order.display_id ?? order.id.slice(-6)}</strong><span>{order.email || "عميل ضيف"}</span></div>
            <span>{order.items.length} منتجات</span>
            <strong>{formatMoney(order.vendor_total, order.currency_code)}</strong>
          </article>
        )) : <div className="merchant-v2__empty">لا توجد طلبات حتى الآن.</div>}
      </div>
    </section>
  );
}

function ProfileScreen({ vendor, member }: { vendor: MerchantVendor; member: MerchantMember }) {
  return (
    <section className="merchant-v2__simple-screen">
      <header><h1>بيانات المتجر</h1><p>هوية متجرك والنطاقات المرتبطة به</p></header>
      <dl className="merchant-v2__profile-grid">
        <div><dt>اسم المتجر</dt><dd>{vendor.name}</dd></div>
        <div><dt>المعرف</dt><dd dir="ltr">{vendor.handle}</dd></div>
        <div><dt>البريد</dt><dd dir="ltr">{member.email}</dd></div>
        <div><dt>النطاق</dt><dd dir="ltr">{vendor.domains[0] || "غير مربوط"}</dd></div>
      </dl>
    </section>
  );
}

function SecurityScreen({
  form,
  isSaving,
  onChange,
  onSave,
}: {
  form: MerchantPasswordForm;
  isSaving: boolean;
  onChange: (form: MerchantPasswordForm) => void;
  onSave: () => Promise<void>;
}) {
  return (
    <section className="merchant-v2__simple-screen">
      <header><h1>الأمان</h1><p>تغيير كلمة مرور حساب البائع</p></header>
      <form className="merchant-v2__security-form" onSubmit={(event) => { event.preventDefault(); void onSave(); }}>
        <label><span>كلمة المرور الحالية</span><input type="password" value={form.current_password} onChange={(event) => onChange({ ...form, current_password: event.target.value })} /></label>
        <label><span>كلمة المرور الجديدة</span><input type="password" value={form.new_password} onChange={(event) => onChange({ ...form, new_password: event.target.value })} /></label>
        <label><span>تأكيد كلمة المرور</span><input type="password" value={form.confirm_password} onChange={(event) => onChange({ ...form, confirm_password: event.target.value })} /></label>
        <button className="merchant-v2__create-button" disabled={isSaving} type="submit">{isSaving ? "جار التحديث..." : "تغيير كلمة المرور"}</button>
      </form>
    </section>
  );
}

function DeleteProductDialog({
  isDeleting,
  onCancel,
  onConfirm,
  product,
}: {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  product: MerchantProduct;
}) {
  return (
    <div className="vendor-product-delete__backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target && !isDeleting) onCancel();
    }} role="presentation">
      <section aria-labelledby="delete-product-title" aria-modal="true" className="vendor-product-delete" role="dialog">
        <span className="vendor-product-delete__icon"><Trash size={24} /></span>
        <h2 id="delete-product-title">Delete this product?</h2>
        <p><strong>{product.title}</strong> and all of its variants will be removed from your store. This action cannot be undone.</p>
        <div>
          <button className="vendor-product-delete__cancel" disabled={isDeleting} onClick={onCancel} type="button">Cancel</button>
          <button className="vendor-product-delete__confirm" disabled={isDeleting} onClick={() => void onConfirm()} type="button">{isDeleting ? "Deleting..." : "Delete Product"}</button>
        </div>
      </section>
    </div>
  );
}

export function MerchantDashboard(props: MerchantDashboardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<DashboardTheme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const savedTheme = window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY);
    return savedTheme === "light" ? "light" : "dark";
  });
  const [deleteCandidate, setDeleteCandidate] = useState<MerchantProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteCandidate) {
      return;
    }
    setIsDeleting(true);
    try {
      await props.onDeleteProduct(deleteCandidate);
      setDeleteCandidate(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (props.activeTab === "home") {
    return (
      <VendorDashboardHome
        isDemo={props.isDemo}
        member={props.member}
        onLogout={props.onLogout}
        onStartCreateProduct={props.onStartCreateProduct}
        onTabChange={props.onTabChange}
        orders={props.orders}
        products={props.products}
        vendor={props.vendor}
      />
    );
  }

  const showProductWorkspace =
    props.activeTab === "products" &&
    (props.isCreatingProduct || Boolean(props.selectedProduct));

  if (showProductWorkspace) {
    return (
      <>
        <VendorProductEditor
          form={props.productForm}
          isCreatingProduct={props.isCreatingProduct}
          isDemo={props.isDemo}
          isSavingProduct={props.isSavingProduct}
          isUploadingProductImages={props.isUploadingProductImages}
          member={props.member}
          notice={props.notice}
          onBack={props.onCancelProductEdit}
          onChange={props.onProductFormChange}
          onLogout={props.onLogout}
          onRequestDelete={() => {
            if (props.selectedProduct) {
              setDeleteCandidate(props.selectedProduct);
            }
          }}
          onSave={props.onSaveProduct}
          onTabChange={props.onTabChange}
          onUpload={props.onUploadProductImages}
          product={props.selectedProduct}
          vendor={props.vendor}
        />
        {deleteCandidate ? (
          <DeleteProductDialog
            isDeleting={isDeleting}
            onCancel={() => setDeleteCandidate(null)}
            onConfirm={confirmDelete}
            product={deleteCandidate}
          />
        ) : null}
      </>
    );
  }

  if (!showProductWorkspace) {
    return (
      <VendorDashboardSections
        activeTab={props.activeTab as Exclude<DashboardTab, "home">}
        isDemo={props.isDemo}
        isSavingPassword={props.isSavingPassword}
        member={props.member}
        notice={props.notice}
        onLogout={props.onLogout}
        onPasswordFormChange={props.onPasswordFormChange}
        onSavePassword={props.onSavePassword}
        onSelectProduct={props.onSelectProduct}
        onStartCreateProduct={props.onStartCreateProduct}
        onTabChange={props.onTabChange}
        orders={props.orders}
        passwordForm={props.passwordForm}
        products={props.products}
        vendor={props.vendor}
      />
    );
  }

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  };

  return (
    <main
      className={`merchant-dashboard-v2 merchant-dashboard-v2--${theme} ${collapsed ? "is-collapsed" : ""}`}
      dir="rtl"
    >
      <div className="merchant-v2__main-frame">
        <MerchantTopbar
          member={props.member}
          onLogout={props.onLogout}
          onToggleTheme={toggleTheme}
          theme={theme}
          vendor={props.vendor}
        />
        <div className="merchant-v2__body">
          <div className="merchant-v2__content">
            {props.notice ? (
              <div className={`merchant-v2__notice merchant-v2__notice--${props.notice.tone}`} role="status">
                {props.notice.text}
              </div>
            ) : null}
            {props.activeTab === "products" ? (
              showProductWorkspace ? (
                <ProductWorkspace
                  form={props.productForm}
                  isCreatingProduct={props.isCreatingProduct}
                  isSavingProduct={props.isSavingProduct}
                  isUploadingProductImages={props.isUploadingProductImages}
                  onBack={props.onCancelProductEdit}
                  onChange={props.onProductFormChange}
                  onRequestDelete={setDeleteCandidate}
                  onSave={props.onSaveProduct}
                  onUpload={props.onUploadProductImages}
                  product={props.selectedProduct}
                />
              ) : (
                <ProductsScreen
                  onRequestDelete={setDeleteCandidate}
                  onSelectProduct={props.onSelectProduct}
                  onStartCreateProduct={props.onStartCreateProduct}
                  products={props.products}
                  selectedProduct={props.selectedProduct}
                />
              )
            ) : null}
            {props.activeTab === "orders" ? <OrdersScreen orders={props.orders} /> : null}
            {props.activeTab === "profile" ? <ProfileScreen member={props.member} vendor={props.vendor} /> : null}
            {props.activeTab === "security" ? (
              <SecurityScreen
                form={props.passwordForm}
                isSaving={props.isSavingPassword}
                onChange={props.onPasswordFormChange}
                onSave={props.onSavePassword}
              />
            ) : null}
          </div>
        </div>
        <footer className="merchant-v2__footer">جميع الحقوق محفوظة لـ LabibTech © 2026</footer>
      </div>

      <MerchantSidebar
        activeTab={props.activeTab}
        collapsed={collapsed}
        onCollapse={() => setCollapsed((value) => !value)}
        onTabChange={props.onTabChange}
      />
      {deleteCandidate ? (
        <DeleteProductDialog
          isDeleting={isDeleting}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={confirmDelete}
          product={deleteCandidate}
        />
      ) : null}
    </main>
  );
}
