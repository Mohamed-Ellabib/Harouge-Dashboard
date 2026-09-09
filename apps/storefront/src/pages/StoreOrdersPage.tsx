import { useEffect, useState } from "react";
import { loadTrackedOrders, type TrackedOrder } from "../commerce/tracked-orders";
import { formatStorefrontMoney } from "../lib/money";
import { StorefrontLink } from "../lib/navigation";
import type { ConfiguredStorefrontProfileDto } from "../types";
import { DropsNavigation } from "../templates/drops/DropsNavigation";
import { LuxeFullBottomNavigation } from "../templates/luxe-commerce-full/LuxeFullBottomNavigation";
import "./store-orders.css";

export function StoreOrdersPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [state, setState] = useState("Loading your saved orders…");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState("Loading your saved orders…");
    void loadTrackedOrders(profile.handle).then(result => { if (active) { setOrders(result); setState(result.length ? "" : "No saved orders on this browser yet."); } }).catch(() => { if (active) setState("Order status is unavailable. Please try again."); });
    return () => { active = false; };
  }, [profile.handle, retry]);
  return <section className="store-orders-page">
    <header><StorefrontLink to="/">← Store</StorefrontLink><h1>My Orders</h1><button type="button" onClick={() => setRetry(value => value + 1)}>Refresh</button></header>
    <p role="status">{state}</p>
    {orders.map(order => <article key={order.display_id}>
      <header><h2>Order #{order.display_id}</h2><strong>{order.progress}</strong></header>
      {["urbx", "template-6"].includes(profile.storefront.template_key) && <StorefrontLink to={`/order-details/${encodeURIComponent(String(order.display_id))}`}>View order details</StorefrontLink>}
      {order.items.map((item, index) => <div className="store-orders-item" key={index}>{item.thumbnail_url && <img src={item.thumbnail_url} alt={item.title} />}<div><h3>{item.title}</h3><p>Quantity: {item.quantity}</p></div><strong>{formatStorefrontMoney(item.total, order.currency_code, profile.locale)}</strong></div>)}
      <ol>{["confirmed", "processing", "shipped", "delivered"].map((step, index) => <li key={step} className={index <= ["confirmed", "processing", "shipped", "delivered"].indexOf(order.progress) ? "is-complete" : ""}>{step}</li>)}</ol>
      <footer><span>{order.payment.method === "cod" ? "Cash on delivery · payment due" : "Bank transfer · awaiting verification"}</span><strong>{formatStorefrontMoney(order.total, order.currency_code, profile.locale)}</strong></footer>
    </article>)}
    {["template-6", "standard"].includes(profile.storefront.template_key) ? null : profile.storefront.template_key === "drops" ? <DropsNavigation profile={profile} /> : <LuxeFullBottomNavigation profile={profile} />}
  </section>;
}
