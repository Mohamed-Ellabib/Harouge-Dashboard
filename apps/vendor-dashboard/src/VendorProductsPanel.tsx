import { useMemo, useRef, useState } from "react";
import {
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  Cube,
  FunnelSimple,
  MagnifyingGlass,
  Package,
  PencilSimple,
  Plus,
  TrendUp,
  Warning,
} from "@phosphor-icons/react";

import "./vendor-products-panel.css";

type ProductStatus = "draft" | "proposed" | "published" | "rejected";

export type PortalProduct = {
  id: string;
  title: string;
  handle: string;
  status: ProductStatus;
  thumbnail: string | null;
  variants?: Array<{
    id: string;
    title: string;
    sku: string | null;
    manage_inventory: boolean;
    inventory_quantity?: number | null;
    available_quantity?: number | null;
    options?: Array<{ value: string; option?: { title?: string } }>;
    prices?: Array<{ amount: number | string | null; currency_code: string | null }>;
  }>;
};

type VendorProductsPanelProps = {
  isDemo: boolean;
  onSelectProduct: (product: PortalProduct) => void;
  onStartCreateProduct: () => void;
  onToast: (message: string) => void;
  products: PortalProduct[];
  topSearch: string;
};

type ProductFilter = "all" | "active" | "draft" | "low" | "out";
type ViewStatus = "Active" | "Draft" | "Low Stock" | "Out of Stock";

type ProductRow = {
  category: string;
  image: string;
  name: string;
  price: string;
  sku: string;
  source?: PortalProduct;
  status: ViewStatus;
  stock: number;
};

const demoRows: ProductRow[] = [
  { name: "Curren Luxury Chronograph", sku: "CW-8363", category: "Watches", stock: 32, price: "LYD 1,250", status: "Active", image: "/assets/dashboard-reference/watch-luxury-chrono.png" },
  { name: "Naviforce Stainless Steel", sku: "NF-9193", category: "Watches", stock: 18, price: "LYD 980", status: "Active", image: "/assets/dashboard-reference/watch-sport-titanium.png" },
  { name: "Megir Leather Strap", sku: "MG-2050", category: "Watches", stock: 7, price: "LYD 760", status: "Low Stock", image: "/assets/dashboard-reference/watch-classic-leather.png" },
  { name: "Lige Classic Automatic", sku: "LG-8935", category: "Watches", stock: 0, price: "LYD 1,100", status: "Out of Stock", image: "/assets/dashboard-reference/watch-silver-automatic.png" },
  { name: "Skmei Sport Digital", sku: "SK-1251", category: "Watches", stock: 26, price: "LYD 420", status: "Active", image: "/assets/dashboard-reference/watch-digital-black.png" },
  { name: "Poedagar Royal Gold", sku: "PD-930", category: "Watches", stock: 12, price: "LYD 1,450", status: "Draft", image: "/assets/dashboard-reference/watch-royal-gold.png" },
];

const imageFallbacks = demoRows.map((row) => row.image);

const rowFilterValue = (status: ViewStatus): ProductFilter => {
  if (status === "Active") return "active";
  if (status === "Draft") return "draft";
  if (status === "Low Stock") return "low";
  return "out";
};

const productStock = (product: PortalProduct) =>
  (product.variants ?? []).reduce((sum, variant) => {
    const quantity = variant.available_quantity ?? variant.inventory_quantity ?? 0;
    return sum + Number(quantity || 0);
  }, 0);

const productViewStatus = (product: PortalProduct, stock: number): ViewStatus => {
  if (product.status === "draft") return "Draft";
  if (product.variants?.length && stock <= 0) return "Out of Stock";
  if (product.variants?.length && stock <= 7) return "Low Stock";
  return product.status === "published" ? "Active" : "Draft";
};

const productPrice = (product: PortalProduct) => {
  const price = product.variants?.[0]?.prices?.[0];
  if (price?.amount === null || price?.amount === undefined) return "—";
  return `${(price.currency_code || "LYD").toUpperCase()} ${Number(price.amount).toLocaleString("en-US")}`;
};

function ProductKpi({
  active,
  helper,
  icon: Icon,
  label,
  onClick,
  value,
}: {
  active?: boolean;
  helper: string;
  icon: typeof Cube;
  label: string;
  onClick: () => void;
  value: number;
}) {
  return (
    <button className={`vendor-products__kpi ${active ? "is-primary" : ""}`} onClick={onClick} type="button">
      <span className="vendor-products__kpi-label">{label}</span>
      <span className="vendor-products__kpi-icon"><Icon size={25} /></span>
      <strong>{value.toLocaleString("en-US")}</strong>
      <small><TrendUp size={15} />{helper}</small>
    </button>
  );
}

function CatalogGauge({ active, draft, out }: { active: number; draft: number; out: number }) {
  const total = active + draft + out;
  const percentage = total ? Math.round((active / total) * 100) : 0;
  return (
    <article className="vendor-products__health">
      <header><h2>Catalog Health</h2><button aria-label="Open catalog overview" type="button"><ArrowSquareOut size={17} /></button></header>
      <div className="vendor-products__gauge" role="img" aria-label={`${percentage}% products active`}>
        <span />
        <i className="is-start" aria-hidden="true" />
        <i className="is-end" aria-hidden="true" />
        <div><strong>{percentage}%</strong><small>Products Active</small></div>
      </div>
      <dl>
        <div><dt><i className="is-active" />Active</dt><dd>{active}</dd></div>
        <div><dt><i className="is-draft" />Draft</dt><dd>{draft}</dd></div>
        <div><dt><i className="is-out" />Out of Stock</dt><dd>{out}</dd></div>
      </dl>
    </article>
  );
}

export function VendorProductsPanel({
  isDemo,
  onSelectProduct,
  onStartCreateProduct,
  onToast,
  products,
  topSearch,
}: VendorProductsPanelProps) {
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [localQuery, setLocalQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const rows = useMemo<ProductRow[]>(() => {
    if (isDemo) {
      return demoRows.map((row, index) => ({ ...row, source: products[index] }));
    }
    return products.map((product, index) => {
      const stock = productStock(product);
      return {
        category: "Store product",
        image: product.thumbnail || imageFallbacks[index % imageFallbacks.length],
        name: product.title,
        price: productPrice(product),
        sku: product.variants?.[0]?.sku || product.handle,
        source: product,
        status: productViewStatus(product, stock),
        stock,
      };
    });
  }, [isDemo, products]);

  const normalizedQuery = (localQuery || topSearch).trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const matchesQuery = !normalizedQuery || row.name.toLowerCase().includes(normalizedQuery) || row.sku.toLowerCase().includes(normalizedQuery);
    const matchesFilter = filter === "all" || rowFilterValue(row.status) === filter;
    return matchesQuery && matchesFilter;
  });
  const visibleRows = isDemo ? filteredRows : filteredRows.slice((page - 1) * 6, page * 6);
  const counts = isDemo
    ? { total: 148, active: 132, draft: 9, low: 7, out: 7 }
    : {
        total: rows.length,
        active: rows.filter((row) => row.status === "Active").length,
        draft: rows.filter((row) => row.status === "Draft").length,
        low: rows.filter((row) => row.status === "Low Stock").length,
        out: rows.filter((row) => row.status === "Out of Stock").length,
      };

  const selectFilter = (nextFilter: ProductFilter) => {
    setFilter(nextFilter);
    setPage(1);
    setShowAdvanced(false);
  };

  const openProduct = (row: ProductRow) => {
    if (row.source) {
      onSelectProduct(row.source);
      return;
    }
    onStartCreateProduct();
  };

  const handleImport = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      onToast("Choose a CSV file to import products.");
      return;
    }
    onToast(`${file.name} is ready to import.`);
  };

  return (
    <div className="vendor-products">
      <header className="vendor-products__header">
        <div><h1>Products</h1><p>Manage your catalog, pricing and product availability.</p></div>
        <div className="vendor-products__actions">
          <button className="is-primary" onClick={onStartCreateProduct} type="button"><Plus size={21} />Add Product</button>
          <button onClick={() => importRef.current?.click()} type="button">Import Products</button>
          <input accept=".csv,text/csv" hidden onChange={(event) => handleImport(event.target.files?.[0])} ref={importRef} type="file" />
        </div>
      </header>

      <section className="vendor-products__kpis">
        <ProductKpi active helper={isDemo ? "+12 this month" : "+ catalog total"} icon={Cube} label="Total Products" onClick={() => selectFilter("all")} value={counts.total} />
        <ProductKpi helper="Visible in store" icon={CheckCircle} label="Active Products" onClick={() => selectFilter("active")} value={counts.active} />
        <ProductKpi helper="Waiting to publish" icon={PencilSimple} label="Draft Products" onClick={() => selectFilter("draft")} value={counts.draft} />
        <ProductKpi helper="Needs attention" icon={Warning} label="Low Stock" onClick={() => selectFilter("low")} value={counts.low} />
      </section>

      <section className="vendor-products__lower">
        <article className="vendor-products__catalog">
          <div className="vendor-products__catalog-title"><h2>All Products</h2><span>{counts.total} products</span></div>
          <div className="vendor-products__toolbar">
            <label><MagnifyingGlass size={18} /><input onChange={(event) => { setLocalQuery(event.target.value); setPage(1); }} placeholder="Search product name or SKU" value={localQuery} /></label>
            <div className="vendor-products__tabs" role="tablist" aria-label="Product status">
              {([[
                "all", "All"
              ], ["active", "Active"], ["draft", "Draft"], ["low", "Low Stock"], ["out", "Out of Stock"]] as Array<[ProductFilter, string]>).map(([value, label]) => (
                <button aria-selected={filter === value} className={filter === value ? "is-active" : ""} key={value} onClick={() => selectFilter(value)} role="tab" type="button">{label}</button>
              ))}
            </div>
            <div className="vendor-products__filter-wrap">
              <button className="vendor-products__filter" onClick={() => setShowAdvanced((current) => !current)} type="button"><FunnelSimple size={18} />Filter</button>
              {showAdvanced ? <div className="vendor-products__filter-menu"><button onClick={() => selectFilter("low")} type="button">Low stock only</button><button onClick={() => selectFilter("out")} type="button">Out of stock</button><button onClick={() => selectFilter("all")} type="button">Clear filters</button></div> : null}
            </div>
          </div>

          <div className="vendor-products__table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={`${row.sku}-${row.name}`}>
                    <td><button className="vendor-products__product-cell" onClick={() => openProduct(row)} type="button"><img alt="" src={row.image} /><span><strong>{row.name}</strong><small>SKU: {row.sku}</small></span></button></td>
                    <td>{row.category}</td>
                    <td>{row.stock}</td>
                    <td>{row.price}</td>
                    <td><span className={`vendor-products__status is-${rowFilterValue(row.status)}`}>{row.status}</span></td>
                    <td><button aria-label={`Open ${row.name}`} className="vendor-products__row-action" onClick={() => openProduct(row)} type="button"><CaretRight size={15} /></button></td>
                  </tr>
                ))}
                {!visibleRows.length ? <tr><td colSpan={6}><div className="vendor-products__empty">No products match this filter.</div></td></tr> : null}
              </tbody>
            </table>
          </div>

          <footer className="vendor-products__footer">
            <span>Showing {visibleRows.length ? `${(page - 1) * 6 + 1}–${(page - 1) * 6 + visibleRows.length}` : "0"} of {counts.total}</span>
            <nav aria-label="Product pages">
              <button aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button"><CaretLeft size={15} /></button>
              {[1, 2, 3].map((value) => <button className={page === value ? "is-active" : ""} key={value} onClick={() => setPage(value)} type="button">{value}</button>)}
              <span>...</span><button className={page === 25 ? "is-active" : ""} onClick={() => setPage(25)} type="button">25</button>
              <button aria-label="Next page" onClick={() => setPage((value) => Math.min(25, value + 1))} type="button"><CaretRight size={15} /></button>
            </nav>
          </footer>
        </article>

        <aside className="vendor-products__side">
          <CatalogGauge active={counts.active} draft={counts.draft} out={counts.out} />
          <article className="vendor-products__alert">
            <h2>Inventory Alert</h2><strong>{counts.low} Low Stock</strong><p>{isDemo ? "3 products sold out" : `${counts.out} products sold out`}</p>
            <button onClick={() => selectFilter("low")} type="button">Review Inventory</button>
          </article>
        </aside>
      </section>
    </div>
  );
}
