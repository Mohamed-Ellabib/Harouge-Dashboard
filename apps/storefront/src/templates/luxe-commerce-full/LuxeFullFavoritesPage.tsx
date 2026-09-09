import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { fetchStorefrontPurchaseOptions } from "../../api/storefront-api";
import { useCart } from "../../commerce/CartContext";
import { useFavorites } from "../../commerce/FavoritesContext";
import {
  CartIcon,
  ChevronLeftIcon,
  HeartIcon,
  PackageIcon,
  TrashIcon,
  WatchIcon,
} from "../../components/Icons";
import { StorefrontLink } from "../../lib/navigation";
import type { StorefrontProductCardDto, StorefrontProfileDto } from "../../types";
import { LuxeFullBottomNavigation } from "./LuxeFullBottomNavigation";

import "./reference-source/src/pages/storefront/CustomerOrdersPage.css";
import "./reference-source/src/pages/storefront/FavoritesPage.css";
import "./reference-source/src/pages/storefront/StorefrontSurface.css";

type FilterKey = "all" | "watches" | "sunglasses" | "pens";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "watches", label: "الساعات" },
  { key: "sunglasses", label: "النظارات" },
  { key: "pens", label: "الأقلام" },
];

const collectionFor = (product: StorefrontProductCardDto): Exclude<FilterKey, "all"> => {
  const value = `${product.handle} ${product.title}`.toLowerCase();
  if (/(sunglass|glasses|نظ)/.test(value)) return "sunglasses";
  if (/(pen|قلم)/.test(value)) return "pens";
  return "watches";
};

const collectionLabel = (product: StorefrontProductCardDto) => ({
  watches: "الساعات",
  sunglasses: "النظارات",
  pens: "الأقلام",
})[collectionFor(product)];

const money = (amount: number): string => `LYD ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;

export function LuxeFullFavoritesPage({ profile }: { profile: StorefrontProfileDto }) {
  const { favorites, toggleFavorite } = useFavorites();
  const { addItem, capability, cart, pending } = useCart();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    document.title = `المفضلة | ${profile.name}`;
  }, [profile.name]);

  const visible = useMemo(() => activeFilter === "all" ? favorites : favorites.filter((product) => collectionFor(product) === activeFilter), [activeFilter, favorites]);
  const itemCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  const addFavoriteToCart = async (product: StorefrontProductCardDto) => {
    const currency = capability.online_checkout.status === "available" ? capability.online_checkout.currency_code : null;
    if (!currency) {
      setNotice("الشراء غير متاح الآن.");
      return;
    }
    try {
      const options = await fetchStorefrontPurchaseOptions(product.handle, currency);
      const variant = options.variants.find((entry) => entry.available_for_sale);
      if (!variant) {
        setNotice("هذا المنتج غير متوفر حالياً.");
        return;
      }
      await addItem(variant.id);
      setNotice(`تمت إضافة ${product.title} إلى السلة.`);
    } catch {
      setNotice("تعذرت إضافة المنتج إلى السلة.");
    }
  };

  return (
    <section className="customer-orders-page customer-favorites-page">
      <div className="customer-orders-page__shell">
        <section className="customer-orders-page__hero" aria-labelledby="customer-favorites-title">
          <header className="customer-orders-page__topbar" aria-label="شريط المفضلة">
            <StorefrontLink to="/watches" ariaLabel="الرجوع"><ChevronLeftIcon /></StorefrontLink>
            <strong>المفضلة</strong>
            <StorefrontLink to="/cart" ariaLabel="سلة التسوق"><CartIcon /><span>{itemCount}</span></StorefrontLink>
          </header>
          <div className="customer-orders-page__hero-content"><h1 id="customer-favorites-title">المفضلة</h1></div>
        </section>

        <section className="customer-orders-page__body" aria-label="قائمة المفضلة">
          <div className="customer-orders-page__filters customer-favorites-page__filters" role="tablist" aria-label="تصفية المفضلة">
            {filters.map((filter) => <button className={activeFilter === filter.key ? "is-active" : undefined} type="button" role="tab" aria-selected={activeFilter === filter.key} key={filter.key} onClick={() => setActiveFilter(filter.key)}>{filter.label}</button>)}
          </div>
          {notice ? <p className="luxe-full-favorites-notice" role="status">{notice}</p> : null}
          {visible.length === 0 ? (
            <div className="customer-orders-page__empty"><HeartIcon /><h2>{favorites.length === 0 ? "لا توجد منتجات مفضلة بعد" : "لا توجد منتجات في هذا التصنيف"}</h2><p>{favorites.length === 0 ? "اضغط على أيقونة القلب في المنتجات لحفظها هنا." : "اختر تصنيفاً آخر من الأعلى لعرض مفضلتك."}</p><StorefrontLink to="/watches">تسوق الآن</StorefrontLink></div>
          ) : (
            <div className="customer-favorites-page__list">
              {visible.map((product, index) => <article className="customer-favorites-page__card" key={product.handle} style={{ "--favorite-card-delay": `${index * 70}ms` } as CSSProperties}>
                <StorefrontLink className="customer-favorites-page__image-link" to={`/products/${encodeURIComponent(product.handle)}`} ariaLabel={product.title}><span className="customer-favorites-page__image-box">{product.thumbnail_url ? <img src={product.thumbnail_url} alt={product.title} /> : <PackageIcon />}</span></StorefrontLink>
                <button className="customer-favorites-page__heart" type="button" onClick={() => toggleFavorite(product)} aria-label={`إزالة ${product.title} من المفضلة`}><HeartIcon filled /></button>
                <StorefrontLink className="customer-favorites-page__copy" to={`/products/${encodeURIComponent(product.handle)}`} ariaLabel={product.title}><span dir="ltr">{product.brand ?? profile.name}</span><strong dir="rtl">{product.title}</strong><em className="is-available">متوفر الآن <HeartIcon filled /></em><small>{collectionLabel(product)} <WatchIcon /></small></StorefrontLink>
                <div className="customer-favorites-page__actions"><strong dir="ltr">{product.price_lyd ? money(product.price_lyd) : "السعر عند الاختيار"}</strong><button type="button" onClick={() => void addFavoriteToCart(product)} disabled={pending}><span>{pending ? "جارٍ الإضافة..." : "أضف إلى السلة"}</span><CartIcon /></button><button type="button" onClick={() => toggleFavorite(product)}><span>إزالة</span><TrashIcon /></button></div>
              </article>)}
            </div>
          )}
        </section>
      </div>
      <LuxeFullBottomNavigation
        className="customer-orders-page__bottom-nav"
        profile={profile}
      />
    </section>
  );
}
