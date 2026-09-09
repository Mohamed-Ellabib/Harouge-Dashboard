import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CaretDown,
  Cube,
  Database,
  Plus,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";

import { VendorPortalShell, type VendorPortalTab } from "./VendorPortalShell";
import "./vendor-product-editor.css";

type ProductStatus = "draft" | "proposed" | "published" | "rejected";

export type VendorEditorImageForm = {
  id?: string;
  url: string;
};

export type VendorEditorVariantForm = {
  id?: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  sku: string;
};

export type VendorEditorProductForm = {
  title: string;
  handle: string;
  status: ProductStatus;
  description: string;
  thumbnail: string;
  price: string;
  currency_code: string;
  sku: string;
  variant_title: string;
  images: VendorEditorImageForm[];
  variants: VendorEditorVariantForm[];
};

export type VendorEditorProduct = {
  id: string;
  title: string;
  handle: string;
  status: ProductStatus;
  thumbnail: string | null;
};

type VendorEditorVendor = {
  name: string;
  handle: string;
  domains: string[];
};

type VendorEditorMember = {
  email: string;
  role: "owner" | "manager";
};

type VendorEditorNotice = {
  tone: "success" | "error" | "info";
  text: string;
};

type ProductEditorPanelProps = {
  form: VendorEditorProductForm;
  isCreatingProduct: boolean;
  isSavingProduct: boolean;
  isUploadingProductImages: boolean;
  onBack: () => void;
  onChange: (form: VendorEditorProductForm) => void;
  onRequestDelete: (product: VendorEditorProduct) => void;
  onSave: () => Promise<void>;
  onUpload: (files: File[]) => Promise<void>;
  product: VendorEditorProduct | null;
};

type VendorProductEditorProps = ProductEditorPanelProps & {
  isDemo: boolean;
  member: VendorEditorMember;
  notice: VendorEditorNotice | null;
  onLogout: () => Promise<void>;
  onTabChange: (tab: VendorPortalTab) => void;
  vendor: VendorEditorVendor;
};

const statusCopy: Record<ProductStatus, string> = {
  draft: "Draft",
  proposed: "Proposed",
  published: "Published",
  rejected: "Rejected",
};

const blankVariant = (): VendorEditorVariantForm => ({
  size: "",
  color: "",
  price: "",
  stock: "",
  sku: "",
});

const colorSwatch = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("white")) return "#f7f7f5";
  if (normalized.includes("blue")) return "#255ea8";
  if (normalized.includes("gray") || normalized.includes("grey")) return "#7b817e";
  if (normalized.includes("brown")) return "#6b4631";
  if (normalized.includes("red")) return "#b73b37";
  return "#050505";
};

function ProductBasicInformation({
  form,
  onChange,
}: {
  form: VendorEditorProductForm;
  onChange: (form: VendorEditorProductForm) => void;
}) {
  return (
    <section className="vendor-product-editor__card vendor-product-editor__basic">
      <header className="vendor-product-editor__card-heading">
        <div>
          <h2>Basic Information</h2>
          <p>Details shown on your storefront.</p>
        </div>
        <span className={`vendor-product-editor__status is-${form.status}`}>
          <i aria-hidden="true" />
          {statusCopy[form.status]}
        </span>
      </header>

      <div className="vendor-product-editor__fields">
        <label>
          <span>Product Name</span>
          <input
            required
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
          />
        </label>
        <label>
          <span>Product Slug</span>
          <input
            required
            dir="ltr"
            value={form.handle}
            onChange={(event) => onChange({ ...form, handle: event.target.value })}
          />
        </label>
        <label>
          <span>Display Status</span>
          <span className="vendor-product-editor__status-select">
            <i className={`is-${form.status}`} aria-hidden="true" />
            <select
              aria-label="Display Status"
              value={form.status}
              onChange={(event) => onChange({ ...form, status: event.target.value as ProductStatus })}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="proposed">Proposed</option>
              <option value="rejected">Rejected</option>
            </select>
          </span>
        </label>
        <label className="vendor-product-editor__description">
          <span>Description</span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
          />
        </label>
      </div>
    </section>
  );
}

function ProductImagesEditor({
  form,
  isUploading,
  onChange,
  onUpload,
}: {
  form: VendorEditorProductForm;
  isUploading: boolean;
  onChange: (form: VendorEditorProductForm) => void;
  onUpload: (files: File[]) => Promise<void>;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const activeIndex = Math.min(imageIndex, Math.max(0, form.images.length - 1));
  const activeImage = form.images[activeIndex];

  const moveImage = (direction: -1 | 1) => {
    const target = activeIndex + direction;
    if (target < 0 || target >= form.images.length) return;
    const images = [...form.images];
    [images[activeIndex], images[target]] = [images[target], images[activeIndex]];
    onChange({ ...form, images });
    setImageIndex(target);
  };

  const removeImage = () => {
    if (!activeImage) return;
    onChange({
      ...form,
      images: form.images.filter((_, index) => index !== activeIndex),
    });
    setImageIndex(Math.max(0, activeIndex - 1));
  };

  const addImageUrl = () => {
    const url = urlDraft.trim();
    if (!url || form.images.length >= 12) return;
    onChange({ ...form, images: [...form.images, { url }] });
    setImageIndex(form.images.length);
    setUrlDraft("");
    setIsAddingUrl(false);
  };

  return (
    <section className="vendor-product-editor__card vendor-product-editor__images">
      <header className="vendor-product-editor__card-heading">
        <div>
          <h2>Product Images</h2>
          <p>Upload photos or add an image URL.</p>
        </div>
      </header>

      <div className={`vendor-product-editor__image-preview ${activeImage ? "" : "is-empty"}`}>
        {activeImage ? <img alt={form.title || "Product"} src={activeImage.url} /> : <span>Upload a product photo</span>}
        {activeImage && activeIndex === 0 ? <b>Cover Image</b> : null}
      </div>
      <p className="vendor-product-editor__image-path">{activeImage?.url || "No image selected"}</p>

      <div className="vendor-product-editor__image-actions">
        <button
          className="vendor-product-editor__upload"
          disabled={isUploading || form.images.length >= 12}
          onClick={() => uploadRef.current?.click()}
          type="button"
        >
          <UploadSimple size={20} />
          {isUploading ? "Uploading..." : "Upload Photos"}
        </button>
        <input
          accept="image/jpeg,image/png,image/webp"
          hidden
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void onUpload(files);
          }}
          ref={uploadRef}
          type="file"
        />
        <button aria-label="Move image up" disabled={!activeImage || activeIndex === 0} onClick={() => moveImage(-1)} type="button"><ArrowUp size={20} /></button>
        <button aria-label="Move image down" disabled={!activeImage || activeIndex === form.images.length - 1} onClick={() => moveImage(1)} type="button"><ArrowDown size={20} /></button>
        <button aria-label="Delete image" className="is-danger" disabled={!activeImage} onClick={removeImage} type="button"><Trash size={19} /></button>
      </div>

      {isAddingUrl ? (
        <div className="vendor-product-editor__url-form">
          <input
            autoFocus
            aria-label="Image URL"
            onChange={(event) => setUrlDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addImageUrl();
              }
            }}
            placeholder="https://..."
            value={urlDraft}
          />
          <button onClick={addImageUrl} type="button">Add</button>
          <button aria-label="Cancel image URL" onClick={() => { setIsAddingUrl(false); setUrlDraft(""); }} type="button">Cancel</button>
        </div>
      ) : (
        <button className="vendor-product-editor__add-url" disabled={form.images.length >= 12} onClick={() => setIsAddingUrl(true)} type="button"><Plus size={20} />Add Image URL</button>
      )}
    </section>
  );
}

function ProductVariantsEditor({
  form,
  onChange,
}: {
  form: VendorEditorProductForm;
  onChange: (form: VendorEditorProductForm) => void;
}) {
  const totalStock = useMemo(
    () => form.variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0),
    [form.variants],
  );

  const updateVariant = (index: number, field: keyof VendorEditorVariantForm, value: string) => {
    onChange({
      ...form,
      variants: form.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    });
  };

  const removeVariant = (index: number) => {
    const variants = form.variants.length === 1
      ? [blankVariant()]
      : form.variants.filter((_, variantIndex) => variantIndex !== index);
    onChange({ ...form, variants });
  };

  return (
    <section className="vendor-product-editor__card vendor-product-editor__variants">
      <header>
        <div>
          <h2>Variants &amp; Inventory</h2>
          <p>Manage product options, SKU, price and available stock.</p>
        </div>
        <button
          disabled={form.variants.length >= 50}
          onClick={() => onChange({ ...form, variants: [...form.variants, blankVariant()] })}
          type="button"
        >
          <Plus size={17} />Add Variant
        </button>
      </header>

      <div className="vendor-product-editor__variant-scroll">
        {form.variants.map((variant, index) => {
          const inStock = Number(variant.stock) > 0;
          return (
            <div className="vendor-product-editor__variant" key={variant.id ?? `variant-${index}`}>
              <label><span>Size</span><input aria-label={`Variant ${index + 1} size`} onChange={(event) => updateVariant(index, "size", event.target.value)} placeholder="42" required value={variant.size} /></label>
              <label className="vendor-product-editor__color-field">
                <span>Color</span>
                <span className="vendor-product-editor__color-input">
                  <i aria-hidden="true" style={{ background: colorSwatch(variant.color) }} />
                  <input aria-label={`Variant ${index + 1} color`} onChange={(event) => updateVariant(index, "color", event.target.value)} placeholder="Black" required value={variant.color} />
                  <CaretDown size={15} />
                </span>
              </label>
              <label><span>SKU</span><input aria-label={`Variant ${index + 1} SKU`} dir="ltr" onChange={(event) => updateVariant(index, "sku", event.target.value)} placeholder="SH-BLK-42" value={variant.sku} /></label>
              <label><span>Price ({form.currency_code.toUpperCase() || "LYD"})</span><input aria-label={`Variant ${index + 1} price`} inputMode="decimal" min="0" onChange={(event) => updateVariant(index, "price", event.target.value)} placeholder="0" required type="number" value={variant.price} /></label>
              <label><span>Stock</span><input aria-label={`Variant ${index + 1} stock`} inputMode="numeric" min="0" onChange={(event) => updateVariant(index, "stock", event.target.value)} placeholder="0" required type="number" value={variant.stock} /></label>
              <div className="vendor-product-editor__variant-action">
                <span className={inStock ? "is-in-stock" : "is-out-stock"}>{inStock ? "In Stock" : "Out"}</span>
                <button aria-label={`Delete variant ${index + 1}`} onClick={() => removeVariant(index)} type="button"><Trash size={18} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <footer>
        <span><Cube size={20} />{form.variants.length} {form.variants.length === 1 ? "Variant" : "Variants"}</span>
        <i aria-hidden="true" />
        <span><Database size={20} />{totalStock.toLocaleString("en-US")} Units Available</span>
        <i aria-hidden="true" />
        <span className="vendor-product-editor__published-summary"><b aria-hidden="true" />{statusCopy[form.status]}</span>
      </footer>
    </section>
  );
}

function ProductEditorPanel({
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
}: ProductEditorPanelProps) {
  return (
    <form
      className="vendor-product-editor"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <fieldset disabled={isSavingProduct}>
        <header className="vendor-product-editor__header">
          <div>
            <p className="vendor-product-editor__breadcrumb"><span>Products</span><b>/</b>{isCreatingProduct ? "New Product" : form.title || "Product"}</p>
            <h1>{isCreatingProduct ? "Add Product" : "Edit Product"}</h1>
            <p className="vendor-product-editor__subtitle">{isCreatingProduct ? "Add product details, images, variants and inventory." : "Update product details, images, variants and inventory."}</p>
          </div>
          <div className="vendor-product-editor__header-actions">
            <button className="is-back" onClick={onBack} type="button"><ArrowLeft size={19} />Back to Products</button>
            {!isCreatingProduct && product ? <button className="is-delete" onClick={() => onRequestDelete(product)} type="button"><Trash size={19} />Delete Product</button> : null}
            <button className="is-save" type="submit">{isSavingProduct ? "Saving..." : isCreatingProduct ? "Create Product" : "Save Changes"}</button>
          </div>
        </header>

        <div className="vendor-product-editor__top-grid">
          <ProductBasicInformation form={form} onChange={onChange} />
          <ProductImagesEditor form={form} isUploading={isUploadingProductImages} onChange={onChange} onUpload={onUpload} />
        </div>
        <ProductVariantsEditor form={form} onChange={onChange} />
      </fieldset>
    </form>
  );
}

export function VendorProductEditor(props: VendorProductEditorProps) {
  const [topSearch, setTopSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  };

  const visibleNotice = toast
    ? { tone: "info" as const, text: toast }
    : props.notice;

  return (
    <VendorPortalShell
      activeTab="products"
      isDemo={props.isDemo}
      member={props.member}
      notice={visibleNotice}
      onLogout={props.onLogout}
      onSearchChange={setTopSearch}
      onTabChange={props.onTabChange}
      onToast={showToast}
      searchPlaceholder="Search products or SKU"
      searchValue={topSearch}
      variant="products"
      vendor={props.vendor}
    >
      <ProductEditorPanel
        form={props.form}
        isCreatingProduct={props.isCreatingProduct}
        isSavingProduct={props.isSavingProduct}
        isUploadingProductImages={props.isUploadingProductImages}
        onBack={props.onBack}
        onChange={props.onChange}
        onRequestDelete={props.onRequestDelete}
        onSave={props.onSave}
        onUpload={props.onUpload}
        product={props.product}
      />
    </VendorPortalShell>
  );
}
