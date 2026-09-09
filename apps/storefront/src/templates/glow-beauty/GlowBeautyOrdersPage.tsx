import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  IoBagHandleOutline,
  IoCheckmark,
  IoCheckmarkCircleOutline,
  IoFilterOutline,
  IoSearchOutline,
} from "react-icons/io5";
import { PiPackageLight, PiTruckLight } from "react-icons/pi";

import { GlowBeautyStatusBar } from "./GlowBeautyChrome";
import { loadTrackedOrders, type TrackedOrder } from "../../commerce/tracked-orders";
import { useOptionalCart } from "../../commerce/CartContext";
import { StorefrontLink } from "../../lib/navigation";
import { formatStorefrontMoney } from "../../lib/money";
import type { StorefrontProfileDto } from "../../types";
import "./glow-beauty-home.css";
import "./glow-beauty-orders.css";

const asset = (name: string) => `/assets/glow-beauty/${name}`;
const previewQuery = "preview=1&template=glow-beauty";

type OrderTab = "Active" | "Completed" | "Cancelled";
type OrderStatus = "IN TRANSIT" | "PROCESSING" | "DELIVERED" | "CONFIRMED";

type PreviewOrder = {
  id: string;
  date: string;
  status: OrderStatus;
  itemCount: number;
  total: number;
  images: string[];
  progress: number;
  deliveryTitle: string;
  deliveryDetail?: string;
};

const activeOrders: PreviewOrder[] = [
  {
    id: "GLW-28451",
    date: "Aug 29, 2026",
    status: "IN TRANSIT",
    itemCount: 3,
    total: 54.97,
    images: [
      asset("product-radiance-serum-wishlist-v2.png"),
      asset("product-matte-lipstick.png"),
      asset("product-hydra-moisturizer.png"),
    ],
    progress: 3,
    deliveryTitle: "Arriving Sep 2",
    deliveryDetail: "Standard Delivery",
  },
  {
    id: "GLW-28398",
    date: "Aug 28, 2026",
    status: "PROCESSING",
    itemCount: 2,
    total: 52.98,
    images: [
      asset("product-rose-eau-de-parfum-wishlist.png"),
      asset("product-glow-foundation.png"),
    ],
    progress: 1,
    deliveryTitle: "Preparing your order",
  },
];

const completedOrder: PreviewOrder = {
  id: "GLW-27812",
  date: "Aug 18, 2026",
  status: "DELIVERED",
  itemCount: 1,
  total: 24.99,
  images: [asset("product-radiance-serum-wishlist-v2.png")],
  progress: 4,
  deliveryTitle: "Delivered Aug 21",
};

const progressLabels = ["Ordered", "Packed", "Shipped", "Delivered"];
const tabCounts: Record<OrderTab, number> = { Active: 2, Completed: 4, Cancelled: 1 };

function OrderProgress({ progress, english }: { progress: number; english: boolean }) {
  const labels = english ? progressLabels : ["تم الطلب", "تم التجهيز", "تم الشحن", "تم التسليم"];
  return (
    <ol className={`glow-beauty-orders-progress progress-${progress}`} aria-label={english ? "Order progress" : "مراحل الطلب"}>
      {labels.map((label, index) => {
        const completed = index < progress;
        const current = index === progress;
        return (
          <li key={label} className={completed ? "is-complete" : current ? "is-current" : ""}>
            <span>{completed ? <IoCheckmark aria-hidden="true" /> : null}</span>
            <b>{label}</b>
          </li>
        );
      })}
    </ol>
  );
}

export function GlowBeautyOrdersPage({ profile }: { profile?: StorefrontProfileDto } = {}) {
  const locale = profile?.locale ?? "en-LY";
  const english = locale === "en-LY";
  const tabLabels: Record<OrderTab, string> = { Active: "الجارية", Completed: "المكتملة", Cancelled: "الملغاة" };
  const statusLabels: Record<OrderStatus, string> = {
    "IN TRANSIT": "في الطريق", PROCESSING: "قيد التجهيز", DELIVERED: "تم التسليم", CONFIRMED: "تم التأكيد",
  };
  const cart = useOptionalCart();
  const [savedOrders, setSavedOrders] = useState<TrackedOrder[]>([]);
  const [details, setDetails] = useState<TrackedOrder | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(Boolean(profile));
  const [activeTab, setActiveTab] = useState<OrderTab>("Active");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [cartCount, setCartCount] = useState(2);
  const [trackedProgress, setTrackedProgress] = useState(3);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!profile) return;
    let active = true; setLoading(true);
    void loadTrackedOrders(profile.handle).then(orders => { if (active) { setSavedOrders(orders); setNotice(""); } }).catch(() => { if (active) setNotice(english ? "Order status could not be loaded. Please try again." : "تعذّر تحميل حالة الطلب. حاولي مرة أخرى."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile?.handle, refresh, english]);
  const runtimeOrders: PreviewOrder[] = savedOrders.map(order => ({
    id: String(order.display_id), date: new Date(order.created_at).toLocaleDateString(english ? "en-GB" : "ar-LY"),
    status: order.progress === "shipped" ? "IN TRANSIT" : order.progress.toUpperCase() as OrderStatus,
    progress: ["confirmed", "processing", "shipped", "delivered"].indexOf(order.progress) + 1,
    images: order.items.flatMap(item => item.thumbnail_url ? [item.thumbnail_url] : []), itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: order.total, deliveryTitle: order.progress === "confirmed" ? (english ? "Order received" : "تم استلام الطلب") : order.progress === "processing" ? (english ? "Preparing your order" : "جارٍ تجهيز طلبك") : order.progress === "shipped" ? (english ? "Your order is on its way" : "طلبك في الطريق إليك") : (english ? "Delivered" : "تم التسليم"),
    deliveryDetail: english ? "Status updated by your store" : "يحدّث المتجر حالة الطلب",
  }));
  const counts = profile ? { Active: runtimeOrders.filter(o => o.progress < 4).length, Completed: runtimeOrders.filter(o => o.progress === 4).length, Cancelled: 0 } : tabCounts;

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = profile ? `${english ? "My Orders" : "طلباتي"} | ${profile.name}` : "My Orders — Glow Beauty Preview";
    document.documentElement.lang = english ? "en" : "ar";
    document.documentElement.dir = english ? "ltr" : "rtl";
    document.documentElement.classList.add("glow-beauty-preview-document");
    document.body.classList.add("glow-beauty-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDirection;
      document.documentElement.classList.remove("glow-beauty-preview-document");
      document.body.classList.remove("glow-beauty-preview-document");
    };
  }, [profile, english]);

  const visibleActiveOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = profile ? runtimeOrders.filter(order => activeTab === "Active" ? order.progress < 4 : activeTab === "Completed" ? order.progress === 4 : false) : activeOrders;
    return source.filter((order) => !normalizedQuery || order.id.toLowerCase().includes(normalizedQuery));
  }, [query, profile, savedOrders, activeTab, english]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  const trackOrder = () => {
    if (profile) { setRefresh(value => value + 1); return; }
    setTrackedProgress((current) => {
      const next = Math.min(4, current + 1);
      setNotice(next === 4 ? "Order GLW-28451 was delivered" : "Tracking refreshed");
      return next;
    });
  };

  const openDetails = (id: string) => profile ? setDetails(savedOrders.find(order => String(order.display_id) === id) ?? null) : setNotice(`Order ${id} details opened in preview`);

  const reorder = () => {
    setCartCount((count) => count + 1);
    setNotice("Radiance Serum added to your bag again");
  };

  return (
    <div className="glow-beauty-page glow-beauty-orders-page" dir={english ? "ltr" : "rtl"} lang={english ? "en" : "ar"}>
      <GlowBeautyStatusBar preview={!profile} />

      <header className="glow-beauty-orders-header">
        <div><p>{english ? "Track every beauty delivery" : "تابعي كل طلبات الجمال"}</p><h1>{english ? "My Orders" : "طلباتي"}</h1></div>
        <StorefrontLink to={profile ? "/cart" : `/cart?${previewQuery}`} ariaLabel={english ? "Open your bag" : "فتح سلة التسوق"}>
          <IoBagHandleOutline aria-hidden="true" /><b>{profile ? cart?.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0 : cartCount}</b>
        </StorefrontLink>
      </header>

      <main>
        <div className="glow-beauty-orders-search-row">
          <form role="search" onSubmit={submitSearch}>
            <IoSearchOutline aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={english ? "Search by order number" : "البحث برقم الطلب"}
              placeholder={english ? "Search by order number..." : "ابحثي برقم الطلب..."}
            />
          </form>
          <button
            type="button"
            aria-label={english ? "Filter orders" : "تصفية الطلبات"}
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
          >
            <IoFilterOutline aria-hidden="true" />
          </button>
          {filterOpen ? (
            <div className="glow-beauty-orders-filter" role="menu">
              <button type="button" role="menuitem" onClick={() => { setActiveTab("Active"); setFilterOpen(false); }}>{english ? "Active orders" : "الطلبات الجارية"}</button>
              <button type="button" role="menuitem" onClick={() => { setActiveTab("Completed"); setFilterOpen(false); }}>{english ? "Delivered orders" : "الطلبات المستلمة"}</button>
              <button type="button" role="menuitem" onClick={() => { setQuery(""); setFilterOpen(false); }}>{english ? "Clear filters" : "مسح الفلاتر"}</button>
            </div>
          ) : null}
        </div>

        <nav className="glow-beauty-orders-tabs" aria-label={english ? "Order status" : "حالة الطلب"}>
          {(Object.keys(tabCounts) as OrderTab[]).map((tab) => (
            <button
              type="button"
              key={tab}
              className={activeTab === tab ? "is-active" : ""}
              aria-pressed={activeTab === tab}
              onClick={() => { setActiveTab(tab); setQuery(""); }}
            >
              {english ? tab : tabLabels[tab]} <b>{counts[tab]}</b>
            </button>
          ))}
        </nav>

        {profile || activeTab === "Active" ? (
          <>
            <section className="glow-beauty-active-orders" aria-labelledby="glow-beauty-active-orders-title">
              <h2 id="glow-beauty-active-orders-title">{profile ? (english ? `${activeTab} Orders` : `الطلبات ${tabLabels[activeTab]}`) : "Active Orders"}</h2>
              {visibleActiveOrders.map((order, orderIndex) => {
                const progress = !profile && orderIndex === 0 ? trackedProgress : order.progress;
                return (
                  <article className={`glow-beauty-order-card order-${orderIndex + 1}`} key={order.id}>
                    <header>
                      <div><h3>{english ? "Order" : "طلب"} #<bdi>{order.id}</bdi></h3><p>{order.date}</p></div>
                      <span>{english ? (progress === 4 ? "DELIVERED" : order.status) : statusLabels[progress === 4 ? "DELIVERED" : order.status]}</span>
                    </header>
                    <div className="glow-beauty-order-card__summary">
                      <div className="glow-beauty-order-card__images">
                        {order.images.map((image, index) => <img key={image} src={image} alt={english ? `Order item ${index + 1}` : `منتج الطلب ${index + 1}`} />)}
                      </div>
                      <aside>
                        <p>{english ? `${order.itemCount} items` : `عدد المنتجات: ${order.itemCount}`}</p>
                        <strong>{profile ? formatStorefrontMoney(order.total, "lyd", profile.locale) : `$${order.total.toFixed(2)}`}</strong>
                        <div>
                          {orderIndex === 0 ? <PiTruckLight aria-hidden="true" /> : <PiPackageLight aria-hidden="true" />}
                          <span><b>{!profile && progress === 4 ? "Delivered Aug 31" : order.deliveryTitle}</b>{order.deliveryDetail ? <small>{order.deliveryDetail}</small> : null}</span>
                        </div>
                      </aside>
                    </div>
                    <OrderProgress progress={progress} english={english} />
                    <footer>
                      {profile || orderIndex === 0 ? <button type="button" disabled={loading} onClick={trackOrder}>{loading ? (english ? "Refreshing…" : "جارٍ التحديث…") : (english ? "Track Order" : "تتبّع الطلب")}</button> : null}
                      <button type="button" onClick={() => openDetails(order.id)}>{english ? "View Details" : "عرض التفاصيل"}</button>
                      {!profile && orderIndex === 1 ? <a href="mailto:support@glowbeauty.test">Need Help?</a> : null}
                    </footer>
                  </article>
                );
              })}
              {!visibleActiveOrders.length ? (
                <div className="glow-beauty-orders-empty"><IoSearchOutline aria-hidden="true" /><strong>{loading ? (english ? "Loading saved orders…" : "جارٍ تحميل الطلبات المحفوظة…") : (english ? "No matching orders" : "لا توجد طلبات مطابقة")}</strong><p>{profile ? (english ? "Orders placed on this browser appear here. Your order details stay private." : "تظهر هنا الطلبات التي أُجريت من هذا المتصفح. تبقى تفاصيل طلباتك خاصة.") : "Try another order number."}</p>{profile ? <button onClick={trackOrder}>{english ? "Refresh orders" : "تحديث الطلبات"}</button> : null}</div>
              ) : null}
            </section>

            {!profile && !query ? (
              <section className="glow-beauty-recent-orders" aria-labelledby="glow-beauty-recent-orders-title">
                <header><h2 id="glow-beauty-recent-orders-title">Recent Orders</h2><button type="button" onClick={() => setActiveTab("Completed")}>View All</button></header>
                <article>
                  <div className="glow-beauty-recent-order__title"><h3>Order #{completedOrder.id}</h3><p>{completedOrder.date}</p></div>
                  <span>DELIVERED</span>
                  <img src={completedOrder.images[0]} alt="Radiance Serum" />
                  <div className="glow-beauty-recent-order__amount"><p>1 item</p><strong>${completedOrder.total.toFixed(2)}</strong></div>
                  <div className="glow-beauty-recent-order__delivery"><IoCheckmarkCircleOutline aria-hidden="true" /><span>Delivered Aug 21</span></div>
                  <footer><button type="button" onClick={reorder}>Reorder</button><button type="button" onClick={() => setNotice("Rating form opened for GLW-27812")}>Rate Items</button></footer>
                </article>
              </section>
            ) : null}
          </>
        ) : activeTab === "Completed" ? (
          <section className="glow-beauty-orders-state" aria-labelledby="glow-beauty-completed-title">
            <h2 id="glow-beauty-completed-title">Completed Orders</h2>
            <article><IoCheckmarkCircleOutline aria-hidden="true" /><div><strong>Order #{completedOrder.id}</strong><p>Delivered Aug 21 · ${completedOrder.total.toFixed(2)}</p></div><button type="button" onClick={reorder}>Reorder</button></article>
          </section>
        ) : (
          <section className="glow-beauty-orders-state glow-beauty-orders-state--empty" aria-labelledby="glow-beauty-cancelled-title">
            <h2 id="glow-beauty-cancelled-title">Cancelled Orders</h2>
            <PiPackageLight aria-hidden="true" /><strong>No recent cancellations</strong><p>Your cancelled beauty orders will appear here.</p>
          </section>
        )}
      </main>

      <span role="status" aria-live="polite">{notice}</span>
      {details ? <section className="glow-beauty-order-card" aria-label={english ? "Order details" : "تفاصيل الطلب"}><header><h3>{english ? "Order" : "طلب"} #<bdi>{details.display_id}</bdi></h3><button onClick={() => setDetails(null)}>{english ? "Close" : "إغلاق"}</button></header>{details.items.map((item, index) => <p key={index}>{item.title} × {item.quantity} · {formatStorefrontMoney(item.total, details.currency_code, profile?.locale ?? "en-LY")}</p>)}<p>{english ? "Payment:" : "الدفع:"} {details.payment.method === "cod" ? (english ? "Cash on delivery" : "الدفع عند الاستلام") : (english ? "Bank transfer · awaiting verification" : "تحويل مصرفي · بانتظار التحقق")}</p><strong>{english ? "Total:" : "الإجمالي:"} {formatStorefrontMoney(details.total, details.currency_code, profile?.locale ?? "en-LY")}</strong></section> : null}

    </div>
  );
}

export default GlowBeautyOrdersPage;
