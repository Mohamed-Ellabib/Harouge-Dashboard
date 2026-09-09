import { FormEvent, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  ArrowsClockwise,
  Bell,
  CaretDown,
  ChartBar,
  ChartLineUp,
  CheckCircle,
  Cube,
  EnvelopeSimple,
  Gear,
  Handbag,
  Lifebuoy,
  MagnifyingGlass,
  Package,
  Plus,
  SignOut,
  SquaresFour,
  Storefront,
  UploadSimple,
  UsersThree,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react";

import "./vendor-dashboard-home.css";
import "./vendor-dashboard-motion.css";

type DashboardTab = "home" | "products" | "orders" | "profile" | "security";
type ProductStatus = "draft" | "proposed" | "published" | "rejected";

type HomeVendor = {
  name: string;
  handle: string;
  domains: string[];
  branding: {
    logo_url: string | null;
    primary_color: string | null;
  };
};

type HomeMember = {
  email: string;
  role: "owner" | "manager";
};

type HomeProduct = {
  id: string;
  title: string;
  handle: string;
  status: ProductStatus;
  thumbnail: string | null;
  variants?: Array<{
    inventory_quantity?: number | null;
    available_quantity?: number | null;
  }>;
};

type HomeOrder = {
  id: string;
  display_id: number | string | null;
  status: string;
  currency_code: string | null;
  vendor_total: number;
  created_at: string;
};

export type VendorDashboardHomeProps = {
  isDemo: boolean;
  vendor: HomeVendor;
  member: HomeMember;
  products: HomeProduct[];
  orders: HomeOrder[];
  onLogout: () => Promise<void>;
  onStartCreateProduct: () => void;
  onTabChange: (tab: DashboardTab) => void;
};

type PanelName = "messages" | "notifications" | "account" | null;

const demoWatchProducts = [
  {
    name: "Luxury Chrono Watch",
    sold: "32 sold this month",
    badge: "Top Seller",
    tone: "green",
    image: "/assets/dashboard-reference/watch-luxury-chrono.png",
  },
  {
    name: "Elegant Gold Watch",
    sold: "28 sold this month",
    badge: "High Demand",
    tone: "orange",
    image: "/assets/dashboard-reference/watch-elegant-gold.png",
  },
  {
    name: "Classic Leather Watch",
    sold: "24 sold this month",
    badge: "Trending",
    tone: "blue",
    image: "/assets/dashboard-reference/watch-classic-leather.png",
  },
  {
    name: "Sport Titanium Watch",
    sold: "20 sold this month",
    badge: "New Arrival",
    tone: "gray",
    image: "/assets/dashboard-reference/watch-sport-titanium.png",
  },
];

const productFallbacks = demoWatchProducts.map((product) => product.image);

const salesBars = [
  { day: "M", value: 63, striped: true },
  { day: "T", value: 68 },
  { day: "W", value: 57, label: "74%", light: true },
  { day: "T", value: 78, dark: true },
  { day: "F", value: 78, striped: true },
  { day: "S", value: 59, striped: true },
  { day: "S", value: 71, striped: true },
];

const demoRecentOrders = [
  { number: "#1048", status: "Processing", tone: "blue", icon: ChartLineUp },
  { number: "#1047", status: "Delivered", tone: "green", icon: Cube },
  { number: "#1046", status: "New", tone: "orange", icon: Handbag },
  { number: "#1045", status: "Delivered", tone: "mint", icon: CheckCircle },
  { number: "#1044", status: "Processing", tone: "purple", icon: UsersThree },
];

const normalizeStoreUrl = (domain: string | undefined) => {
  if (!domain) {
    return null;
  }

  if (/^https?:\/\//i.test(domain)) {
    return domain;
  }

  if (domain.startsWith("localhost") || domain.startsWith("127.0.0.1")) {
    return `http://${domain}`;
  }

  return `https://${domain}`;
};

const formatCompactMoney = (value: number) => {
  if (value >= 1000) {
    const compact = value >= 10000 ? (value / 1000).toFixed(1) : (value / 1000).toFixed(2);
    return `LYD ${compact.replace(/\.0$/, "")}K`;
  }

  return `LYD ${Math.round(value).toLocaleString("en-US")}`;
};

const readableOrderStatus = (status: string) => {
  const normalized = status.toLowerCase();
  if (["completed", "delivered", "fulfilled"].includes(normalized)) return "Delivered";
  if (["pending", "requires_action", "processing"].includes(normalized)) return "Processing";
  if (["canceled", "cancelled"].includes(normalized)) return "Canceled";
  return "New";
};

function BrandLockup() {
  return (
    <div className="vendor-home__brand" aria-label="LabibTech">
      <span className="vendor-home__brand-mark" aria-hidden="true">
        <img src="/assets/dashboard-reference/labibtech-l-mark.png" alt="" />
      </span>
      <span className="vendor-home__brand-name">LabibTech</span>
    </div>
  );
}

function TrendNote({ attention = false, inverse = false }: { attention?: boolean; inverse?: boolean }) {
  return (
    <div className={`vendor-home__trend ${attention ? "is-attention" : ""} ${inverse ? "is-inverse" : ""}`}>
      <span>{attention ? <WarningCircle size={16} weight="regular" /> : <ArrowUpRight size={14} weight="bold" />}</span>
      {attention ? "Needs attention" : "Increased from last month"}
    </div>
  );
}

function KpiCard({
  label,
  value,
  primary = false,
  attention = false,
}: {
  label: string;
  value: string;
  primary?: boolean;
  attention?: boolean;
}) {
  return (
    <article className={`vendor-home__kpi ${primary ? "vendor-home__kpi--primary" : ""}`}>
      <div className="vendor-home__kpi-title">
        <span>{label}</span>
        <span className="vendor-home__kpi-link" aria-hidden="true"><ArrowUpRight size={18} /></span>
      </div>
      <strong>{value}</strong>
      <TrendNote attention={attention} inverse={primary} />
    </article>
  );
}

function SalesAnalytics() {
  return (
    <article className="vendor-home__panel vendor-home__analytics" id="sales-analytics">
      <h2>Sales Analytics</h2>
      <div className="vendor-home__bar-chart" role="img" aria-label="Weekly sales analytics">
        {salesBars.map((bar, index) => (
          <div className="vendor-home__bar-column" key={`${bar.day}-${index}`}>
            <div className="vendor-home__bar-rail">
              {bar.label ? <span className="vendor-home__bar-label">{bar.label}</span> : null}
              <span
                className={`vendor-home__bar ${bar.striped ? "is-striped" : ""} ${bar.light ? "is-light" : ""} ${bar.dark ? "is-dark" : ""}`}
                style={{ height: `${bar.value}%` }}
              />
            </div>
            <span className="vendor-home__bar-day">{bar.day}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function NextPayout({ value, onAction }: { value: string; onAction: () => void }) {
  return (
    <article className="vendor-home__panel vendor-home__payout">
      <h2>Next Payout</h2>
      <div className="vendor-home__payout-copy">
        <strong>{value}</strong>
        <span>Expected Aug 15, 2026</span>
      </div>
      <button onClick={onAction} type="button">
        <Wallet size={20} weight="fill" />
        View Payout
      </button>
    </article>
  );
}

function RecentOrders({
  isDemo,
  orders,
  onViewAll,
}: {
  isDemo: boolean;
  orders: HomeOrder[];
  onViewAll: () => void;
}) {
  const items = isDemo
    ? demoRecentOrders
    : orders.slice(0, 5).map((order, index) => {
        const status = readableOrderStatus(order.status);
        return {
          number: `#${order.display_id ?? order.id.slice(-4)}`,
          status,
          tone: status === "Delivered" ? "green" : status === "Processing" ? "blue" : status === "Canceled" ? "orange" : "mint",
          icon: status === "Delivered" ? CheckCircle : status === "Processing" ? ArrowsClockwise : status === "Canceled" ? WarningCircle : [Handbag, Cube][index % 2],
        };
      });

  return (
    <article className="vendor-home__panel vendor-home__recent-orders">
      <div className="vendor-home__panel-heading">
        <h2>Recent Orders</h2>
        <button onClick={onViewAll} type="button">View All</button>
      </div>
      <div className="vendor-home__recent-list">
        {items.length ? items.map((order, index) => {
          const OrderIcon = order.icon;
          return (
            <button className="vendor-home__recent-order" key={`${order.number}-${index}`} onClick={onViewAll} type="button">
              <span className={`vendor-home__order-icon is-${order.tone}`}><OrderIcon size={24} weight={index === 2 ? "fill" : "duotone"} /></span>
              <span>
                <strong>Order {order.number}</strong>
                <small>{order.status}</small>
              </span>
            </button>
          );
        }) : (
          <p className="vendor-home__empty-copy">No orders yet.</p>
        )}
      </div>
    </article>
  );
}

function TopProducts({
  isDemo,
  products,
  onViewAll,
}: {
  isDemo: boolean;
  products: HomeProduct[];
  onViewAll: () => void;
}) {
  const items = isDemo
    ? demoWatchProducts
    : products.slice(0, 4).map((product, index) => ({
        name: product.title,
        sold: product.status === "published" ? "Live in your store" : "Saved as draft",
        badge: ["Top Seller", "High Demand", "Trending", "New Arrival"][index],
        tone: ["green", "orange", "blue", "gray"][index],
        image: product.thumbnail || productFallbacks[index],
      }));

  return (
    <article className="vendor-home__panel vendor-home__top-products">
      <div className="vendor-home__panel-heading">
        <h2>Top Products</h2>
        <button onClick={onViewAll} type="button">View All</button>
      </div>
      <div className="vendor-home__product-list">
        {items.length ? items.map((product) => (
          <button className="vendor-home__product-row" key={product.name} onClick={onViewAll} type="button">
            <img src={product.image} alt="" />
            <span className="vendor-home__product-copy">
              <strong>{product.name}</strong>
              <small>{product.sold}</small>
            </span>
            <span className={`vendor-home__product-badge is-${product.tone}`}>{product.badge}</span>
          </button>
        )) : (
          <p className="vendor-home__empty-copy">Add your first product to see it here.</p>
        )}
      </div>
    </article>
  );
}

function OrderProgress({ percentage }: { percentage: number }) {
  return (
    <article className="vendor-home__panel vendor-home__order-progress">
      <h2>Order Progress</h2>
      <div className="vendor-home__gauge" role="img" aria-label={`${percentage}% of orders completed`}>
        <div className="vendor-home__gauge-track" />
        <div
          className="vendor-home__gauge-value"
          style={{
            "--gauge-mid": `${percentage * 0.41}%`,
            "--gauge-value": `${percentage * 0.5}%`,
          } as CSSProperties}
        />
        <div className="vendor-home__gauge-cap vendor-home__gauge-cap--start"><span /></div>
        <div
          className="vendor-home__gauge-cap vendor-home__gauge-cap--end"
          style={{ "--gauge-angle": `${percentage * 1.8}deg` } as CSSProperties}
        ><span /></div>
        <div className="vendor-home__gauge-center">
          <strong>{percentage}%</strong>
          <span>Orders Completed</span>
        </div>
      </div>
      <div className="vendor-home__legend">
        <span><i className="is-delivered" />Delivered</span>
        <span><i className="is-progress" />In Progress</span>
        <span><i className="is-pending" />Pending</span>
      </div>
    </article>
  );
}

function LowStock({ count, onView }: { count: number; onView: () => void }) {
  return (
    <article className="vendor-home__low-stock">
      <h2>Low Stock</h2>
      <strong>{count} Items</strong>
      <div>
        <button aria-label="View low stock products" onClick={onView} type="button"><Handbag size={25} /></button>
        <span aria-hidden="true"><WarningCircle size={27} weight="fill" /></span>
      </div>
    </article>
  );
}

export function VendorDashboardHome({
  isDemo,
  member,
  onLogout,
  onStartCreateProduct,
  onTabChange,
  orders,
  products,
  vendor,
}: VendorDashboardHomeProps) {
  const referenceQaMode =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("qa") === "1";
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<PanelName>(null);
  const [toast, setToast] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const dashboard = useMemo(() => {
    if (isDemo) {
      return {
        totalSales: "LYD 48.2K",
        totalOrders: "326",
        activeProducts: "148",
        pendingOrders: "12",
        nextPayout: "LYD 8,420",
        lowStock: 7,
        completedPercentage: 68,
      };
    }

    const totalSales = orders.reduce((sum, order) => sum + Number(order.vendor_total || 0), 0);
    const pending = orders.filter((order) => ["pending", "requires_action", "processing"].includes(order.status.toLowerCase())).length;
    const completed = orders.filter((order) => ["completed", "delivered", "fulfilled"].includes(order.status.toLowerCase())).length;
    const trackedVariants = products.flatMap((product) => product.variants ?? []);
    const lowStock = trackedVariants.filter((variant) => {
      const quantity = variant.available_quantity ?? variant.inventory_quantity;
      return typeof quantity === "number" && quantity <= 5;
    }).length;

    return {
      totalSales: formatCompactMoney(totalSales),
      totalOrders: orders.length.toLocaleString("en-US"),
      activeProducts: products.filter((product) => product.status === "published").length.toLocaleString("en-US"),
      pendingOrders: pending.toLocaleString("en-US"),
      nextPayout: `LYD ${Math.round(totalSales).toLocaleString("en-US")}`,
      lowStock,
      completedPercentage: orders.length ? Math.round((completed / orders.length) * 100) : 0,
    };
  }, [isDemo, orders, products]);

  const storeName = isDemo ? "Al Sanousi Store" : vendor.name;
  const roleLabel = member.role === "owner" ? "Vendor Account" : "Store Manager";

  const closePanels = () => setPanel(null);
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const goToStore = () => {
    const demoUrl = "http://127.0.0.1:5176/sport";
    const url = isDemo ? demoUrl : normalizeStoreUrl(vendor.domains[0]);
    if (!url) {
      showToast("Connect a storefront domain in Settings first.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;

    const hasProduct = products.some((product) => product.title.toLowerCase().includes(normalized));
    if (hasProduct || normalized.includes("product")) {
      onTabChange("products");
      return;
    }
    if (normalized.includes("order")) {
      onTabChange("orders");
      return;
    }
    showToast(`No results for “${query.trim()}”.`);
  };

  const handleImport = (file: File | undefined) => {
    if (!file) return;
    showToast(`${file.name} is ready to import.`);
  };

  return (
    <main className={`vendor-home vendor-dashboard-enter ${referenceQaMode ? "vendor-home--reference-viewport" : ""}`} dir="ltr" onClick={closePanels}>
      <div className="vendor-home__app">
        <aside className="vendor-home__sidebar">
          <BrandLockup />

          <nav className="vendor-home__nav" aria-label="Vendor dashboard navigation">
            <span className="vendor-home__nav-label">MENU</span>
            <button className="is-active" onClick={() => onTabChange("home")} type="button"><SquaresFour size={21} weight="fill" /><span>Dashboard</span></button>
            <button onClick={() => onTabChange("orders")} type="button"><Handbag size={21} /><span>Orders</span><small>12+</small></button>
            <button onClick={() => onTabChange("products")} type="button"><Package size={21} /><span>Products</span></button>
            <button onClick={() => onTabChange("products")} type="button"><ChartBar size={21} /><span>Inventory</span></button>
            <button onClick={() => document.getElementById("sales-analytics")?.scrollIntoView({ behavior: "smooth" })} type="button"><ChartLineUp size={21} /><span>Analytics</span></button>
            <button onClick={() => showToast("Customer profiles will appear as orders arrive.")} type="button"><UsersThree size={21} /><span>Customers</span></button>

            <span className="vendor-home__nav-label vendor-home__nav-label--general">GENERAL</span>
            <button onClick={() => onTabChange("profile")} type="button"><Gear size={21} /><span>Settings</span></button>
            <button onClick={() => window.location.assign("mailto:support@labibtech.com")} type="button"><Lifebuoy size={21} /><span>Help</span></button>
            <button onClick={() => void onLogout()} type="button"><SignOut size={21} /><span>Logout</span></button>
          </nav>

          <section className="vendor-home__live-card">
            <Storefront size={20} weight="fill" />
            <h2>Your Store is Live</h2>
            <p>Customers can shop now</p>
            <button onClick={goToStore} type="button">View Store</button>
          </section>
        </aside>

        <section className="vendor-home__workspace">
          <header className="vendor-home__topbar">
            <form className="vendor-home__search" onSubmit={submitSearch}>
              <MagnifyingGlass size={22} />
              <input aria-label="Search orders or products" onChange={(event) => setQuery(event.target.value)} placeholder="Search orders or products" value={query} />
              <kbd>⌘ F</kbd>
            </form>

            <div className="vendor-home__top-actions">
              <div className="vendor-home__popover-anchor">
                <button aria-label="Messages" className="vendor-home__round-button" onClick={(event) => { event.stopPropagation(); setPanel(panel === "messages" ? null : "messages"); }} type="button"><EnvelopeSimple size={21} /></button>
                {panel === "messages" ? <div className="vendor-home__popover" onClick={(event) => event.stopPropagation()}><strong>Messages</strong><p>You are all caught up.</p></div> : null}
              </div>
              <div className="vendor-home__popover-anchor">
                <button aria-label="Notifications" className="vendor-home__round-button" onClick={(event) => { event.stopPropagation(); setPanel(panel === "notifications" ? null : "notifications"); }} type="button"><Bell size={21} /></button>
                {panel === "notifications" ? <div className="vendor-home__popover" onClick={(event) => event.stopPropagation()}><strong>Notifications</strong><p>{dashboard.pendingOrders} orders need your attention.</p></div> : null}
              </div>
              <div className="vendor-home__account-wrap">
                <button className="vendor-home__account" onClick={(event) => { event.stopPropagation(); setPanel(panel === "account" ? null : "account"); }} type="button">
                  <img src="/assets/dashboard-reference/merchant-avatar.png" alt="" />
                  <span><strong>{storeName}</strong><small>{roleLabel}</small></span>
                  <CaretDown size={15} />
                </button>
                {panel === "account" ? (
                  <div className="vendor-home__popover vendor-home__account-menu" onClick={(event) => event.stopPropagation()}>
                    <button onClick={() => onTabChange("profile")} type="button"><Gear size={17} />Store settings</button>
                    <button onClick={() => void onLogout()} type="button"><SignOut size={17} />Sign out</button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <section className="vendor-home__dashboard">
            <header className="vendor-home__dashboard-heading">
              <div>
                <h1>Vendor Dashboard</h1>
                <p>Manage your store and track performance with ease.</p>
              </div>
              <div className="vendor-home__heading-actions">
                <button className="vendor-home__primary-action" onClick={onStartCreateProduct} type="button"><Plus size={20} />Add Product</button>
                <button className="vendor-home__secondary-action" onClick={() => importInputRef.current?.click()} type="button">Import Products</button>
                <input ref={importInputRef} accept=".csv,text/csv" hidden onChange={(event) => handleImport(event.target.files?.[0])} type="file" />
              </div>
            </header>

            <div className="vendor-home__kpi-grid">
              <KpiCard label="Total Sales" primary value={dashboard.totalSales} />
              <KpiCard label="Total Orders" value={dashboard.totalOrders} />
              <KpiCard label="Active Products" value={dashboard.activeProducts} />
              <KpiCard attention label="Pending Orders" value={dashboard.pendingOrders} />
            </div>

            <div className="vendor-home__dashboard-grid">
              <SalesAnalytics />
              <NextPayout value={dashboard.nextPayout} onAction={() => showToast("Payout details are up to date.")} />
              <RecentOrders isDemo={isDemo} orders={orders} onViewAll={() => onTabChange("orders")} />
              <TopProducts isDemo={isDemo} products={products} onViewAll={() => onTabChange("products")} />
              <OrderProgress percentage={dashboard.completedPercentage} />
              <LowStock count={dashboard.lowStock} onView={() => onTabChange("products")} />
            </div>
          </section>
        </section>
      </div>
      {toast ? <div className="vendor-home__toast" role="status"><CheckCircle size={18} weight="fill" />{toast}</div> : null}
    </main>
  );
}
