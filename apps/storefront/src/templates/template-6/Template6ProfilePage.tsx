import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { IconType } from "react-icons";
import { PiBell, PiCaretLeft, PiCaretRight, PiCreditCard, PiGlobe, PiHeadset, PiHeart, PiMapPin, PiPackage, PiPencilSimple, PiSignOut, PiSlidersHorizontal, PiStar, PiTag, PiUser, PiX } from "react-icons/pi";
import { useCart } from "../../commerce/CartContext";
import { useFavorites } from "../../commerce/FavoritesContext";
import { loadTrackedOrders, type TrackedOrder } from "../../commerce/tracked-orders";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { navigate, StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import type { template6ProfilePreview } from "../../dev/template-6-profile-preview";
import { template6ConfirmationReference, template6Progress } from "./template-6-confirmation";
import "./template-6-home.css";
import "./template-6-cart.css";
import "./template-6-checkout.css";
import "./template-6-profile.css";

type Panel = "edit" | "orders" | "offers" | "reviews" | "addresses" | "payments" | "personal" | "language" | "settings" | "notifications" | "logout" | null;
type Design = typeof template6ProfilePreview;
type ProfileOrder = { display_id: string | number; quantity: number; progress: TrackedOrder["progress"] };
const panelTitles = { edit: "Edit Profile", orders: "My Orders", tracking: "Track order", offers: "My Offers", reviews: "My Reviews", addresses: "Delivery Addresses", payments: "Payment Methods", personal: "Personal Information", language: "Language", settings: "Settings", notifications: "Notifications", logout: "Log Out" };

function ProfileRow({ icon: Icon, title, subtitle, value, onClick }: { icon: IconType; title: string; subtitle?: string; value?: string; onClick: () => void }) {
  return <button className="six-profile-row" type="button" onClick={onClick}><Icon aria-hidden="true" /><span><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span>{value && <span className="six-profile-row__value">{value}</span>}<PiCaretRight aria-hidden="true" /></button>;
}

export default function Template6ProfilePage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const { confirmation, capability } = useCart();
  const { favorites } = useFavorites();
  const location = useStorefrontLocation();
  const reference = template6ConfirmationReference(import.meta.env.DEV, isVisualPreviewEnabled(), isStorefrontEditorPreviewEnabled(), location.search);
  const [design, setDesign] = useState<Design | null>(null);
  const [edited, setEdited] = useState<{ name: string; location: string } | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [orderState, setOrderState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const mock = reference ? design : null;
  const name = mock ? edited?.name ?? mock.name : "Guest";
  const city = mock ? edited?.location ?? mock.location : "Shopping with " + profile.name;
  const sampleOrders = !!mock && !confirmation;
  const receiptOrders: ProfileOrder[] = orders.map(order => ({ display_id: order.display_id, quantity: order.items.reduce((sum, item) => sum + item.quantity, 0), progress: order.progress }));
  if (confirmation && !receiptOrders.some(order => String(order.display_id) === String(confirmation.display_id))) receiptOrders.unshift({ display_id: confirmation.display_id, quantity: confirmation.items.reduce((sum, item) => sum + item.quantity, 0), progress: "confirmed" });
  const visibleOrders = sampleOrders ? mock.orders : receiptOrders;
  const latest = visibleOrders[0];
  const loading = !reference && orderState === "loading" && !confirmation;
  const paymentMethods = capability.online_checkout.payment_methods;
  const paymentLabel = mock ? mock.payment : paymentMethods.includes("cod") ? "Cash on Delivery" : paymentMethods.includes("bank_transfer") ? "Bank transfer" : "At checkout";
  const palette = { "--six-accent": profile.branding.primary_color || "#eeff66" } as CSSProperties;

  useEffect(() => { document.title = `My profile | ${profile.name}`; }, [profile.name]);
  useEffect(() => {
    if (!reference) return;
    let active = true;
    void import("../../dev/template-6-profile-preview").then(module => { if (active) setDesign(module.template6ProfilePreview); });
    return () => { active = false; };
  }, [reference]);
  useEffect(() => {
    if (reference) { setOrderState("ready"); return; }
    let active = true;
    setOrderState("loading");
    void loadTrackedOrders(profile.handle).then(result => {
      if (!active) return;
      setOrders([...result].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0))); setOrderState("ready");
    }).catch(() => { if (active) setOrderState("error"); });
    return () => { active = false; };
  }, [profile.handle, reference, retry]);
  useEffect(() => {
    if (panel && !dialog.current?.open) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else if (!panel) { dialog.current?.close(); trigger.current?.focus(); }
  }, [panel]);
  const openTracking = (order: ProfileOrder) => { setPanel(null); navigate(`/order-details/${encodeURIComponent(String(order.display_id))}`); };
  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mock) return;
    const data = new FormData(event.currentTarget);
    const nextName = String(data.get("name") ?? "").trim();
    if (nextName) { setEdited({ name: nextName, location: String(data.get("location") ?? "").trim() }); setPanel(null); }
  };

  return <section className="template-six-home template-six-profile" style={palette} dir="ltr" lang="en" aria-labelledby="six-profile-title">
    <img className="six-home-background" src="/assets/template-6/home-background-v1.webp" alt="" />
    <header className="six-profile-header"><StorefrontLink to="/" ariaLabel="Back to home"><PiCaretLeft aria-hidden="true" /></StorefrontLink><h1 id="six-profile-title">MY PROFILE</h1><button type="button" aria-label="Notifications" className="six-profile-bell" onClick={() => setPanel("notifications")}><PiBell aria-hidden="true" />{mock && <span className="six-profile-unread" />}</button></header>
    <div className="six-profile-content">
      <section className="six-profile-identity" aria-label="Your profile"><div className="six-profile-avatar">{mock ? <img src={mock.avatar} alt={name} /> : <PiUser aria-hidden="true" />}</div><div className="six-profile-identity__copy"><h2>{name}</h2><p><PiMapPin aria-hidden="true" />{city}</p><button type="button" onClick={() => setPanel("edit")}><PiPencilSimple aria-hidden="true" />Edit Profile</button></div></section>
      <div className="six-profile-stats"><button type="button" onClick={() => setPanel("orders")}><PiPackage aria-hidden="true" /><span><strong>{loading ? "…" : orderState === "error" && !visibleOrders.length ? "—" : visibleOrders.length}</strong><small>My Orders</small></span><PiCaretRight aria-hidden="true" /></button><StorefrontLink to="/favorites"><PiHeart aria-hidden="true" /><span><strong>{favorites.length}</strong><small>My Favorites</small></span><PiCaretRight aria-hidden="true" /></StorefrontLink></div>
      <section className="six-profile-latest" aria-label="Latest order"><PiPackage aria-hidden="true" /><div><h2>{latest ? latest.progress === "confirmed" ? "Your order is confirmed" : template6Progress(latest.progress).title : loading ? "Loading your orders" : "Your next great find awaits"}</h2><p>{latest ? `#${latest.display_id} · ${latest.quantity} ${latest.quantity === 1 ? "item" : "items"}` : "No saved order on this browser yet."}</p><p>{latest ? sampleOrders ? "Arrives in 2–3 business days" : "Updates from your store" : "Explore the latest collection"}</p></div><button type="button" onClick={() => latest ? openTracking(latest) : navigate("/categories")}>{latest ? "Track" : "Explore"}<PiCaretRight aria-hidden="true" /></button></section>
      <section className="six-profile-group"><h2>Shopping &amp; Preferences</h2><div className="six-profile-menu">
        <ProfileRow icon={PiTag} title="My Offers" subtitle="Manage your offers" onClick={() => setPanel("offers")} />
        <ProfileRow icon={PiStar} title="My Reviews" subtitle="Ratings and feedback" onClick={() => setPanel("reviews")} />
        <ProfileRow icon={PiMapPin} title="Delivery Addresses" value={mock ? "1 saved" : "At checkout"} onClick={() => setPanel("addresses")} />
        <ProfileRow icon={PiCreditCard} title="Payment Methods" value={paymentLabel} onClick={() => setPanel("payments")} />
      </div></section>
      <section className="six-profile-group six-profile-group--support"><h2>Account &amp; Support</h2><div className="six-profile-menu">
        <ProfileRow icon={PiUser} title="Personal Information" onClick={() => setPanel("personal")} />
        <ProfileRow icon={PiGlobe} title="Language" value="English" onClick={() => setPanel("language")} />
        <ProfileRow icon={PiSlidersHorizontal} title="Settings" onClick={() => setPanel("settings")} />
        <ProfileRow icon={PiHeadset} title="Help & Support" onClick={() => navigate("/contact")} />
      </div></section>
      <button className="six-profile-logout" type="button" onClick={() => setPanel("logout")}><PiSignOut aria-hidden="true" />Log Out</button>
    </div>
    <dialog ref={dialog} className="six-dialog six-profile-dialog" aria-labelledby="six-profile-panel-title" onCancel={event => { event.preventDefault(); setPanel(null); }}>
      <button className="six-dialog__close" type="button" aria-label="Close profile panel" onClick={() => setPanel(null)}><PiX /></button><h2 id="six-profile-panel-title">{panel ? panelTitles[panel] : "My Profile"}</h2>
      {panel === "edit" && mock ? <form onSubmit={saveProfile}><p>Preview-only changes, kept on this page. No customer account is created.</p><label>Name<input name="name" maxLength={60} required defaultValue={name} /></label><label>Location<input name="location" maxLength={100} defaultValue={city} /></label><button type="submit">Save preview</button></form>
        : panel === "orders" ? <><p>{sampleOrders ? "Sample order history for this design preview." : "Orders accessible on this browser for this store."}</p>{orderState === "error" && <p role="status">Couldn’t refresh order updates. <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></p>}{visibleOrders.map(order => <button className="six-profile-order-link" key={order.display_id} type="button" onClick={() => openTracking(order)}><strong>#{order.display_id}</strong><span>{order.quantity} items · {template6Progress(order.progress).title}</span><PiCaretRight /></button>)}{!visibleOrders.length && <p>{loading ? "Loading your orders…" : "No saved orders yet."}</p>}</>
        : panel === "addresses" ? <>{mock && <><h3>Home · {name}</h3><p>{mock.address}</p></>}<p>{mock ? "This is a sample address, not a saved customer address." : "Enter your delivery address at checkout. Saved customer addresses are not connected."}</p><StorefrontLink to="/checkout">Go to checkout</StorefrontLink></>
        : panel === "payments" ? <>{mock && <h3>{mock.payment} · sample only</h3>}<p>Card storage and card payments are not connected. Checkout offers only this store’s supported methods.</p><p>{paymentMethods.map(method => method === "cod" ? "Cash on Delivery" : "Manual bank transfer").join(" · ") || "Checkout is currently unavailable."}</p></>
        : panel === "personal" || panel === "edit" ? <><p>{mock ? `${name} · ${city}` : "You are browsing as a guest."}</p><p>Customer accounts and saved personal information are not connected.</p>{mock && <button type="button" onClick={() => setPanel("edit")}>Edit preview profile</button>}</>
        : panel === "notifications" ? <><p>{latest ? `Order #${latest.display_id}: ${template6Progress(latest.progress).title}.` : "No order updates are available."}</p><p>{sampleOrders ? "This notification is part of the design preview." : "Updates come from your store. Push notifications are not connected."}</p>{latest && <button type="button" onClick={() => openTracking(latest)}>View order</button>}</>
        : panel === "offers" ? <><p>Personal offers and price negotiations aren’t connected.</p><StorefrontLink to="/">Browse the store’s current collection</StorefrontLink></>
        : panel === "reviews" ? <p>Customer reviews aren’t connected. No ratings or reviews have been submitted from this profile.</p>
        : panel === "language" ? <p>This template currently uses the supplied English design. Customer language preferences aren’t connected.</p>
        : panel === "settings" ? <><p>You are using guest shopping. Favorites are scoped to this store and browser; order updates use private order access retained by this browser.</p><StorefrontLink to="/privacy">Privacy policy</StorefrontLink><StorefrontLink to="/terms">Terms &amp; Conditions</StorefrontLink></>
        : panel === "logout" ? <><p>{mock ? "This is a preview profile, not a signed-in account." : "You are browsing as a guest. There is no signed-in account to log out of."}</p><p>Your cart, favorites and saved order access won’t be removed.</p><button type="button" onClick={() => navigate("/")}>Return to store</button></> : null}
    </dialog>
  </section>;
}
