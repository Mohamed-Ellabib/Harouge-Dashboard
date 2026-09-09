import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { PiArrowRight, PiBag, PiCaretLeft, PiHeart, PiHeartFill, PiLockKey, PiMapPin, PiMinus, PiPlus, PiSealCheckFill, PiShoppingCart, PiTicket, PiX } from "react-icons/pi";
import { STOREFRONT_MAX_CART_QUANTITY } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useFavorites } from "../../commerce/FavoritesContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontCartDto } from "../../types";
import { template6CartFavorite, template6CartPhoto, template6CartSummary, template6CartVariant } from "./template-6-cart";
import "./template-6-home.css";
import "./template-6-cart.css";

export default function Template6CartPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const locale = profile.locale;
  const english = locale === "en-LY";
  const t = (en: string, ar: string) => english ? en : ar;
  const context = useOptionalCart();
  const favorites = useFavorites();
  const location = useStorefrontLocation();
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const [promo, setPromo] = useState("");
  const [promoNotice, setPromoNotice] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const cart = context?.cart;
  const items = cart?.items ?? [];
  const summary = cart ? template6CartSummary(cart, reference) : null;
  const count = summary?.count ?? 0;
  const available = context?.capability.online_checkout.status === "available";
  const pending = busy || Boolean(context?.pending);
  const money = (value: number) => reference && english ? `AED ${value.toFixed(2)}` : formatStorefrontMoney(value, reference ? "aed" : cart?.currency_code ?? "lyd", locale);
  const colors = { "--six-accent": profile.branding.primary_color || "#eeff66", "--six-teal": profile.branding.secondary_color || "#0785a7", "--six-cart-link": reference ? "#0085aa" : profile.branding.secondary_color || "#0085aa" } as CSSProperties;
  useEffect(() => { document.title = `${english ? "My cart" : "سلة التسوق"} | ${profile.name}`; }, [profile.name, english]);

  async function change(item: StorefrontCartDto["items"][number], quantity: number | null) {
    if (!context || !available || pending || mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setNotice(""); context.clearError();
    try {
      if (quantity === null) await context.removeItem(item.id);
      else await context.updateQuantity(item.id, quantity);
      setNotice(quantity === null ? t(`${item.title} removed from cart.`, `تمت إزالة ${item.title} من السلة.`) : t(`${item.title}: quantity ${quantity}.`, `${item.title}: الكمية ${quantity}.`));
    } catch { /* Shared error stays visible; never show optimistic totals on failure. */ }
    finally { mutationLock.current = false; setBusy(false); }
  }
  function applyPromo(event: FormEvent) {
    event.preventDefault();
    setPromoNotice(promo.trim() ? t("Promo codes aren’t available at this store yet. Your total hasn’t changed.", "رموز الخصم غير متاحة في هذا المتجر حالياً. لم يتغيّر إجمالي طلبك.") : t("Enter a promo code first.", "أدخل رمز الخصم أولاً."));
  }

  return <div className="template-six-home template-six-cart" style={colors} dir={english ? "ltr" : "rtl"} lang={english ? "en" : "ar"} data-money={reference ? "reference" : "store"}>
    <img className="six-home-background" src="/assets/template-6/home-background-v1.webp" alt="" />
    <header className="six-cart-header">
      <StorefrontLink to="/" className="six-cart-header__back" ariaLabel={t("Back to shopping", "العودة للتسوق")}><PiCaretLeft /></StorefrontLink>
      <h1>{t("MY CART", "سلة التسوق")}</h1>
      <a href="#six-cart-items" className="six-cart-header__bag" aria-label={t(`Your cart, ${count} items`, `سلة التسوق، عدد المنتجات: ${count}`)}><PiBag />{count > 0 && <span className="six-cart-badge">{count}</span>}</a>
    </header>
    <p className="six-cart-tagline">{t("Great finds, ready to be yours.", "اختيارات رائعة، جاهزة لتكون لك.")}</p>
    <section className="six-cart-content" aria-label={t("Shopping cart", "سلة التسوق")}>
      <div className="six-cart-delivery"><PiMapPin /><div><span>{t("Deliver to", "التوصيل إلى")}</span><strong>{reference ? t("Dubai Marina, Dubai", "دبي مارينا، دبي") : t("Choose delivery address", "اختر عنوان التوصيل")}</strong></div><button onClick={() => navigate("/checkout")} disabled={!items.length || pending}>{t("Change", "تغيير")}</button></div>
      <div className="six-cart-store">
        {reference || profile.branding.logo_url ? <img src={reference ? "/assets/template-6/zara-logo-v1.webp" : profile.branding.logo_url!} alt={reference ? "ZARA" : profile.name} /> : <span className="six-cart-store__fallback"><PiBag /></span>}
        <h2>{reference ? t("ZARA Brand Store", "متجر زارا") : profile.name}{reference && <PiSealCheckFill aria-label={t("Sample verified badge", "شارة توثيق تجريبية")} />}</h2><span>{english ? `${count} ${count === 1 ? "item" : "items"}` : `عدد المنتجات: ${count}`}</span>
      </div>
      <p className="six-cart-sr" role="status">{notice}</p>
      {context?.error && <div className="six-cart-notice" role="alert">{context.error}<button onClick={context.clearError}>{t("Dismiss", "إغلاق")}</button></div>}
      {!available ? <section className="six-cart-empty"><PiBag /><h2>{t("Checkout is currently unavailable", "إتمام الطلب غير متاح حالياً")}</h2><StorefrontLink to="/">{t("Continue shopping", "متابعة التسوق")} <PiArrowRight /></StorefrontLink></section>
        : context?.restoring ? <p className="six-cart-empty" role="status">{t("Loading your cart…", "جارٍ تحميل سلة التسوق…")}</p>
          : !items.length ? <section className="six-cart-empty"><PiShoppingCart /><h2>{t("Your next great find is waiting.", "منتجك المفضل القادم بانتظارك.")}</h2><p>{t("Your cart is empty.", "سلة التسوق فارغة.")}</p><StorefrontLink to="/">{t("Continue shopping", "متابعة التسوق")} <PiArrowRight /></StorefrontLink></section>
            : <>
              <section id="six-cart-items" className="six-cart-items" aria-label={t("Your cart items", "منتجات سلة التسوق")} aria-busy={pending}>
                {items.map(item => {
                  const src = template6CartPhoto(item, reference);
                  const product = template6CartFavorite(item);
                  const saved = product ? favorites.isFavorite(product.handle) : false;
                  const variant = template6CartVariant(item.variant_title, reference, locale);
                  const photo = src ? <img src={src} alt={item.title} width="640" height="640" /> : <span>{t("Image unavailable", "الصورة غير متاحة")}</span>;
                  return <article className="six-cart-item" key={item.id}>
                    {product ? <StorefrontLink to={`/products/${encodeURIComponent(product.handle)}`} className="six-cart-item__photo" ariaLabel={t(`View ${item.title}`, `عرض ${item.title}`)}>{photo}</StorefrontLink> : <div className="six-cart-item__photo">{photo}</div>}
                    <div className="six-cart-item__details">
                      <h2>{product ? <StorefrontLink to={`/products/${encodeURIComponent(product.handle)}`}>{item.title}</StorefrontLink> : item.title}</h2>
                      {variant && <p className="six-cart-item__variant">{variant}</p>}
                      <strong className="six-cart-item__price">{money(item.unit_price)}</strong>
                      <div className="six-cart-quantity" role="group" aria-label={t(`Quantity for ${item.title}`, `كمية ${item.title}`)}>
                        <button disabled={pending || item.quantity <= 1} aria-label={t(`Decrease ${item.title} quantity`, `تقليل كمية ${item.title}`)} onClick={() => void change(item, item.quantity - 1)}><PiMinus /></button>
                        <output aria-label={t(`${item.title} quantity`, `كمية ${item.title}`)}>{item.quantity}</output>
                        <button disabled={pending || item.quantity >= STOREFRONT_MAX_CART_QUANTITY} aria-label={t(`Increase ${item.title} quantity`, `زيادة كمية ${item.title}`)} onClick={() => void change(item, item.quantity + 1)}><PiPlus /></button>
                      </div>
                      {product && <button className="six-cart-save" aria-pressed={saved} aria-label={english ? `${saved ? "Unsave" : "Save"} ${item.title}` : `${saved ? "إزالة من المفضلة:" : "حفظ في المفضلة:"} ${item.title}`} onClick={() => { favorites.toggleFavorite(product); setNotice(saved ? t(`${item.title} removed from wishlist.`, `تمت إزالة ${item.title} من المفضلة.`) : t(`${item.title} saved to wishlist.`, `تم حفظ ${item.title} في المفضلة.`)); }}>{saved ? <PiHeartFill /> : <PiHeart />}<span>{saved ? t("Saved", "محفوظ") : t("Save", "حفظ")}</span></button>}
                    </div>
                    <button className="six-cart-remove" aria-label={t(`Remove ${item.title} from cart`, `إزالة ${item.title} من السلة`)} disabled={pending} onClick={() => void change(item, null)}><PiX /></button>
                  </article>;
                })}
              </section>
              <form className="six-cart-promo" onSubmit={applyPromo}><PiTicket /><label className="six-cart-sr" htmlFor="six-cart-promo">{t("Promo code", "رمز الخصم")}</label><input id="six-cart-promo" placeholder={t("Promo code", "رمز الخصم")} value={promo} maxLength={64} autoComplete="off" onChange={event => { setPromo(event.target.value); setPromoNotice(""); }} aria-describedby={promoNotice ? "six-cart-promo-notice" : undefined} /><button>{t("Apply", "تطبيق")}</button></form>
              {promoNotice && <p className="six-cart-notice" id="six-cart-promo-notice" role="status">{promoNotice}</p>}
              <section className="six-cart-summary" aria-label={t("Order summary", "ملخص الطلب")}><h2>{t("Order Summary", "ملخص الطلب")}</h2><dl>
                <div><dt>{t("Subtotal", "المجموع الفرعي")} ({english ? `${count} ${count === 1 ? "item" : "items"}` : `عدد المنتجات: ${count}`})</dt><dd>{money(summary!.subtotal)}</dd></div>
                <div><dt>{t("Delivery", "التوصيل")}</dt><dd>{summary!.delivery === null ? t("At checkout", "عند إتمام الطلب") : money(summary!.delivery)}</dd></div>
                <div className="six-cart-summary__total"><dt>{summary!.delivery === null ? t("Current total", "الإجمالي الحالي") : t("Total", "الإجمالي")}</dt><dd>{money(summary!.total)}</dd></div>
              </dl></section>
              <button className="six-cart-checkout" disabled={pending} onClick={() => navigate("/checkout")}>{t("PROCEED TO CHECKOUT", "المتابعة لإتمام الطلب")} <PiArrowRight /></button>
              <p className="six-cart-secure"><PiLockKey /> {t("Secure checkout", "إتمام الطلب بأمان")}</p>
            </>}
    </section>
  </div>;
}
