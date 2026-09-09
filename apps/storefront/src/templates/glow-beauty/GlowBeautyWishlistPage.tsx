import { FormEvent, useEffect, useMemo, useState } from "react";
import { IoBagHandleOutline, IoChevronDown, IoHeart, IoSearchOutline } from "react-icons/io5";
import { PiStarFill } from "react-icons/pi";

import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { useOptionalCart } from "../../commerce/CartContext";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type {
  StorefrontProductCardDto,
  StorefrontProfileDto,
} from "../../types";
import { GlowBeautyStatusBar } from "./GlowBeautyChrome";
import "./glow-beauty-home.css";
import "./glow-beauty-wishlist.css";

const asset = (name: string) => `/assets/glow-beauty/${name}`;
const previewQuery = "preview=1&template=glow-beauty";

type WishlistCategory = "All" | "Skincare" | "Makeup" | "Fragrance";
type SortMode = "recent" | "price-low" | "rating";

type WishlistProduct = {
  id: string;
  name: string;
  detail: string;
  image: string | null;
  price: number;
  rating: number;
  category: Exclude<WishlistCategory, "All">;
  badge?: string;
  source?: StorefrontProductCardDto;
};

const wishlistProducts: WishlistProduct[] = [
  { id: "radiance-serum", name: "Radiance Serum", detail: "Brightening & Glow", image: asset("product-radiance-serum-wishlist-v2.png"), price: 24.99, rating: 4.8, category: "Skincare" },
  { id: "matte-lipstick", name: "Matte Lipstick", detail: "Long Lasting Color", image: asset("product-matte-lipstick.png"), price: 14.99, rating: 4.9, category: "Makeup", badge: "-20%" },
  { id: "rose-eau-de-parfum", name: "Rose Eau de Parfum", detail: "Elegant Floral Scent", image: asset("product-rose-eau-de-parfum-wishlist.png"), price: 29.99, rating: 4.8, category: "Fragrance" },
  { id: "hydra-moisturizer", name: "Hydra Moisturizer", detail: "24H Hydration", image: asset("product-hydra-moisturizer.png"), price: 19.99, rating: 4.7, category: "Skincare" },
  { id: "glow-foundation", name: "Glow Foundation", detail: "Natural Finish", image: asset("product-glow-foundation.png"), price: 22.99, rating: 4.6, category: "Makeup" },
  { id: "luxe-face-cream", name: "Luxe Face Cream", detail: "Deep Nourishment", image: asset("product-luxe-face-cream.png"), price: 27.99, rating: 4.7, category: "Skincare" },
];

const categories: WishlistCategory[] = ["All", "Skincare", "Makeup", "Fragrance"];

export function GlowBeautyWishlistPage({
  profile,
}: {
  profile?: StorefrontProfileDto;
} = {}) {
  const locale = profile?.locale ?? "en-LY";
  const english = locale === "en-LY";
  const categoryLabels: Record<WishlistCategory, string> = {
    All: "الكل", Skincare: "العناية بالبشرة", Makeup: "المكياج", Fragrance: "العطور",
  };
  const badgeLabels: Record<string, string> = {
    NEW: "جديد", "BEST SELLER": "الأكثر مبيعاً", "BEST SELLERS": "الأكثر مبيعاً",
    SALE: "تخفيض", OFFER: "عرض", HOT: "رائج",
  };
  const badgeLabel = (badge: string) => english ? badge : badgeLabels[badge.trim().toUpperCase()] ?? badge;
  const favoritesContext = useOptionalFavorites();
  const cartContext = useOptionalCart();
  const [savedIds, setSavedIds] = useState(() => new Set(wishlistProducts.map((product) => product.id)));
  const [activeCategory, setActiveCategory] = useState<WishlistCategory>("All");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [previewCartCount, setPreviewCartCount] = useState(2);
  const [addedIds, setAddedIds] = useState(() => new Set<string>());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = profile ? `${english ? "Favorites" : "المفضلة"} | ${profile.name}` : "My Wishlist — Glow Beauty Preview";
    if (!profile) {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
    document.documentElement.classList.add("glow-beauty-preview-document");
    document.body.classList.add("glow-beauty-preview-document");
    return () => {
      document.title = previousTitle;
      if (!profile) {
        document.documentElement.lang = previousLang;
        document.documentElement.dir = previousDirection;
      }
      document.documentElement.classList.remove("glow-beauty-preview-document");
      document.body.classList.remove("glow-beauty-preview-document");
    };
  }, [profile, english]);

  const runtimeFavorites: WishlistProduct[] = (favoritesContext?.favorites ?? []).map((product) => ({
    id: product.handle,
    name: product.title,
    detail: product.subtitle ?? (english ? "Beauty essential" : "من أساسيات الجمال"),
    image: product.thumbnail_url,
    price: product.price_lyd ?? 0,
    rating: 0,
    category: (["Skincare", "Makeup", "Fragrance"] as string[]).includes(product.category ?? "")
      ? product.category as Exclude<WishlistCategory, "All">
      : "Skincare",
    badge: product.badge ?? undefined,
    source: product,
  }));
  const savedProducts = useMemo(
    () => profile ? runtimeFavorites : wishlistProducts.filter((product) => savedIds.has(product.id)),
    [profile, runtimeFavorites, savedIds],
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = savedProducts.filter((product) => {
      const categoryMatches = activeCategory === "All" || product.category === activeCategory;
      const queryMatches = !normalizedQuery || `${product.name} ${product.detail}`.toLowerCase().includes(normalizedQuery);
      return categoryMatches && queryMatches;
    });
    if (sortMode === "price-low") return [...filtered].sort((left, right) => left.price - right.price);
    if (sortMode === "rating") return [...filtered].sort((left, right) => right.rating - left.rating);
    return filtered;
  }, [activeCategory, query, savedProducts, sortMode]);

  const removeSavedProduct = (product: WishlistProduct) => {
    if (profile && product.source && favoritesContext) {
      favoritesContext.toggleFavorite(product.source);
      setNotice(english ? `${product.name} removed from your wishlist` : `تمت إزالة ${product.name} من المفضلة`);
      return;
    }
    setSavedIds((current) => {
      const next = new Set(current);
      next.delete(product.id);
      return next;
    });
    setAddedIds((current) => {
      const next = new Set(current);
      next.delete(product.id);
      return next;
    });
    setNotice(english ? `${product.name} removed from your wishlist` : `تمت إزالة ${product.name} من المفضلة`);
  };

  const addProductToBag = (product: WishlistProduct) => {
    if (profile) {
      navigate(`/products/${encodeURIComponent(product.id)}`);
      return;
    }
    if (!addedIds.has(product.id)) {
      setPreviewCartCount((count) => count + 1);
      setAddedIds((current) => new Set(current).add(product.id));
    }
    setNotice(`${product.name} added to your bag`);
  };

  const addAllToBag = () => {
    if (profile) {
      const first = savedProducts[0];
      if (first) navigate(`/products/${encodeURIComponent(first.id)}`);
      return;
    }
    const newProducts = savedProducts.filter((product) => !addedIds.has(product.id));
    setPreviewCartCount((count) => count + newProducts.length);
    setAddedIds(new Set(savedProducts.map((product) => product.id)));
    setNotice(newProducts.length ? `${newProducts.length} saved items added to your bag` : "All saved items are already in your bag");
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => event.preventDefault();


  const Content = profile ? "div" : "main";
  const cartCount = profile
    ? cartContext?.cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0
    : previewCartCount;

  return (
    <div className="glow-beauty-page glow-beauty-wishlist-page" dir={locale === "ar-LY" ? "rtl" : "ltr"} lang={locale === "ar-LY" ? "ar" : "en"}>
      <GlowBeautyStatusBar preview={!profile} />

      <header className="glow-beauty-wishlist-header">
        <div><p>{english ? "Your saved beauty" : "منتجات الجمال المحفوظة"}</p><h1>{english ? "My Wishlist" : "قائمة المفضلة"}</h1></div>
        <StorefrontLink to={profile ? "/cart" : `/cart?${previewQuery}`} ariaLabel={english ? `${cartCount} items in bag` : `عدد المنتجات في السلة: ${cartCount}`}><IoBagHandleOutline aria-hidden="true" /><b>{cartCount}</b></StorefrontLink>
      </header>

      <Content>
        <section className="glow-beauty-wishlist-summary" aria-label={english ? "Wishlist summary" : "ملخص المفضلة"}>
          <span aria-hidden="true"><IoHeart /></span>
          <div><strong>{english ? `${savedProducts.length} Saved Items` : `المنتجات المحفوظة: ${savedProducts.length}`}</strong><p>{english ? "Your favorites, all in one place" : "كل مفضلاتك في مكان واحد"}</p></div>
          <button type="button" onClick={addAllToBag} disabled={!savedProducts.length}>{profile ? (english ? "Choose options" : "اختر الخيارات") : "Add All to Bag"}</button>
        </section>

        <form className="glow-beauty-wishlist-search" role="search" onSubmit={submitSearch}>
          <IoSearchOutline aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={english ? "Search saved items" : "البحث في المنتجات المحفوظة"} placeholder={english ? "Search saved items..." : "ابحثي في المنتجات المحفوظة..."} />
        </form>

        <nav className="glow-beauty-wishlist-tabs" aria-label={english ? "Wishlist categories" : "فئات المفضلة"}>
          {categories.map((category) => <button key={category} className={activeCategory === category ? "is-active" : ""} type="button" aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>{english ? category : categoryLabels[category]}</button>)}
        </nav>

        <section className="glow-beauty-wishlist-controls" aria-label={english ? "Wishlist controls" : "خيارات المفضلة"}>
          <p>{english ? `${visibleProducts.length} ${visibleProducts.length === 1 ? "item" : "items"}` : `عدد المنتجات: ${visibleProducts.length}`}</p>
          <label>
            <span className="glow-beauty-wishlist-visually-hidden">{english ? "Sort wishlist" : "ترتيب المفضلة"}</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="recent">{english ? "Recently Added" : "المضافة حديثاً"}</option>
              <option value="price-low">{english ? "Price: Low to High" : "السعر: من الأقل إلى الأعلى"}</option>
              <option value="rating">{english ? "Highest Rated" : "الأعلى تقييماً"}</option>
            </select>
            <IoChevronDown aria-hidden="true" />
          </label>
        </section>

        <section className="glow-beauty-wishlist-grid" aria-label={english ? "Saved beauty products" : "منتجات الجمال المحفوظة"} aria-live="polite">
          {visibleProducts.map((product) => {
            const added = addedIds.has(product.id);
            const href = profile ? `/products/${encodeURIComponent(product.id)}` : product.id === "radiance-serum" ? `/products/radiance-serum?${previewQuery}` : undefined;
            return (
              <article className="glow-beauty-wishlist-card" key={product.id}>
                <div className="glow-beauty-wishlist-card__image">
                  {href ? <StorefrontLink to={href} ariaLabel={english ? `View ${product.name}` : `عرض ${product.name}`}>{product.image ? <img src={product.image} alt={product.name} /> : <div className="glow-beauty-image-placeholder" role="img" aria-label={product.name}>{product.name.slice(0, 1)}</div>}</StorefrontLink> : product.image ? <img src={product.image} alt={product.name} /> : null}
                  {product.badge ? <span>{badgeLabel(product.badge)}</span> : null}
                  <button type="button" aria-label={english ? `Remove ${product.name} from wishlist` : `إزالة ${product.name} من المفضلة`} onClick={() => removeSavedProduct(product)}><IoHeart aria-hidden="true" /></button>
                </div>
                <div className="glow-beauty-wishlist-card__copy">
                  <h2>{href ? <StorefrontLink to={href}>{product.name}</StorefrontLink> : product.name}</h2>
                  <p>{product.detail}</p>
                  <div>{product.rating ? <span><PiStarFill aria-hidden="true" /> {product.rating}</span> : <span>{product.badge ? badgeLabel(product.badge) : english ? product.category : categoryLabels[product.category]}</span>}</div>
                  <footer>
                    <strong>{profile ? (product.price ? formatStorefrontMoney(product.price, "lyd", locale) : (english ? "Price unavailable" : "السعر غير متاح")) : `$${product.price.toFixed(2)}`}</strong>
                    <button type="button" className={added ? "is-added" : ""} aria-pressed={added} onClick={() => addProductToBag(product)}><IoBagHandleOutline aria-hidden="true" /> {profile ? (english ? "Choose options" : "اختر الخيارات") : added ? "Added" : "Add to Bag"}</button>
                  </footer>
                </div>
              </article>
            );
          })}
          {!visibleProducts.length ? <div className="glow-beauty-wishlist-empty"><IoHeart aria-hidden="true" /><strong>{english ? "No saved beauty here" : "لا توجد منتجات في المفضلة"}</strong><p>{english ? "Try another category or clear your search." : "جرّبي فئة أخرى أو امسحي البحث."}</p></div> : null}
        </section>
        <p className="glow-beauty-wishlist-notice" role="status" aria-live="polite">{notice}</p>
      </Content>

    </div>
  );
}

export default GlowBeautyWishlistPage;
