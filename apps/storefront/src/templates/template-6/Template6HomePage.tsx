import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiBell, PiMagnifyingGlass, PiCaretLeft, PiCaretRight, PiHeart, PiHeartFill, PiSealCheckFill, PiStarFill, PiCompass, PiShoppingCart, PiUser, PiPlus, PiX, PiMapPin, PiTag } from "react-icons/pi";
import { TbFilterSearch } from "react-icons/tb";
import { useFavorites } from "../../commerce/FavoritesContext";
import { useOptionalCart } from "../../commerce/CartContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { navigate, StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import { formatStorefrontMoney } from "../../lib/money";
import { localizedStorefrontText } from "../../lib/localization";
import type { ConfiguredStorefrontProfileDto, StorefrontHomeContentDto, StorefrontProductCardDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import { loadUrbxShopCatalog } from "../urbx/urbx-shop-catalog";
import { template6HomeContent, template6ProductOrder } from "./template-6-home-content";
import { template6ReferenceCards } from "./template-6-preview-data";
import "./template-6-home.css";

const asset = (name: string) => `/assets/template-6/${name}-v1.webp`;
type Panel = "notifications" | "filters" | "nearby" | "story" | null;
type TextKey = Exclude<keyof StorefrontHomeContentDto, "image_url" | "promotion_image_url">;
export type DiscoveryFilter = "All" | "New Arrived" | "Popular" | "Offer" | "Verified Sellers";
const filters: DiscoveryFilter[] = ["All", "New Arrived", "Popular", "Offer", "Verified Sellers"];
const arabicFilters: Record<DiscoveryFilter, string> = {
  All: "الكل", "New Arrived": "وصل حديثاً", Popular: "الأكثر رواجاً", Offer: "العروض", "Verified Sellers": "بائعون موثّقون",
};
const arabicCategories: Record<string, string> = {
  Skincare: "العناية بالبشرة", Makeup: "المكياج", Fragrance: "العطور", Haircare: "العناية بالشعر",
  Fashion: "الأزياء", Clothing: "الملابس", Hoodies: "هوديز", Jackets: "السترات", Pants: "البناطيل", Shoes: "الأحذية", Accessories: "الإكسسوارات",
};

export function filterTemplate6Products(products: StorefrontProductCardDto[], query: string, filter: DiscoveryFilter, category: string, maxPrice: number | null, categoryAliases: string[] = []) {
  const normalize = (value: string) => value.toLocaleLowerCase().trim();
  return products.filter(product => {
    const match = normalize([product.title, product.subtitle, product.category, product.brand].join(" ")).includes(normalize(query));
    return match && (!category || [category, ...categoryAliases].some(name => normalize(name).replaceAll("-", " ") === normalize(product.category ?? "").replaceAll("-", " "))) && (maxPrice === null || (product.price_lyd != null && product.price_lyd <= maxPrice))
      && (filter !== "New Arrived" || product.badge === "NEW") && (filter !== "Popular" || product.badge === "BEST SELLER")
      && (filter !== "Offer" || (product.price_lyd != null && (product.compare_at_price_lyd ?? 0) > product.price_lyd));
  });
}

export default function Template6HomePage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const locale = profile.locale;
  const english = locale === "en-LY";
  const t = (en: string, ar: string) => english ? en : ar;
  const editor = useGlowBeautyDesignEditor();
  const favorites = useFavorites();
  const cart = useOptionalCart();
  const location = useStorefrontLocation();
  const home = profile.storefront.content.home ?? template6HomeContent;
  const text = (key: TextKey) => english ? editor.value(`home.${key}`, home[key].en) : localizedStorefrontText(home[key], locale);
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(window.location.search).has("setup-preview");
  const [products, setProducts] = useState<StorefrontProductCardDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("q") ?? "");
  const [filter, setFilter] = useState<DiscoveryFilter>(() => new URLSearchParams(location.search).get("filter") === "new" ? "New Arrived" : "All");
  const category = new URLSearchParams(location.search).get("category") ?? "";
  const setCategory = (value: string) => {
    const params = new URLSearchParams(location.search);
    if (value) params.set("category", value); else params.delete("category");
    if (query) params.set("q", query); else params.delete("q");
    navigate(`/?${params.toString()}`);
  };
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const currency = cart?.capability.online_checkout.currency_code ?? "lyd";
  const money = (amount: number) => reference && english ? `AED ${amount.toFixed(2)}` : formatStorefrontMoney(amount, reference ? "aed" : currency, locale);
  const categories = profile.storefront.content.brands.items;
  const categoryName = (item: typeof categories[number]) => english ? editor.value(`category.${item.slug}.name`, item.name.en) : localizedStorefrontText(item.name, locale);
  const productCategory = (value: string | null | undefined) => {
    if (!value) return "";
    const item = categories.find(item => [item.slug, item.name.en, item.name.ar].includes(value));
    return item ? categoryName(item) : english ? value : arabicCategories[value] ?? value;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get("q") ?? "");
    setFilter(params.get("filter") === "new" ? "New Arrived" : "All"); setMaxPrice(null);
  }, [location.search]);

  useEffect(() => {
    document.title = `${profile.name} | ${english ? "Discover" : "اكتشف"}`;
    const controller = new AbortController();
    setStatus("loading");
    void loadUrbxShopCatalog(controller.signal).then(items => {
      if (controller.signal.aborted) return;
      const rank = (handle: string) => { const index = template6ProductOrder.indexOf(handle); return index < 0 ? 99 : index; };
      setProducts(items.sort((a, b) => rank(a.handle) - rank(b.handle))); setStatus("ready");
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [profile, reload, english]);
  useEffect(() => {
    if (panel) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); trigger.current?.focus(); }
  }, [panel]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 2600); return () => window.clearTimeout(timer); }, [notice]);

  const selectedCategory = categories.find(item => [item.slug, item.name.en, item.name.ar].includes(category));
  const categoryTitle = selectedCategory ? categoryName(selectedCategory) : productCategory(category);
  const visible = filterTemplate6Products(products, query, filter, category, maxPrice, selectedCategory ? [selectedCategory.name.en, selectedCategory.name.ar, selectedCategory.slug] : []);
  const hasFilters = Boolean(query.trim() || filter !== "All" || maxPrice !== null);
  const reset = () => {
    setQuery(""); setFilter("All"); setMaxPrice(null);
    const params = new URLSearchParams(location.search);
    params.delete("q"); params.delete("filter");
    navigate(`/?${params.toString()}`, { replace: true });
  };
  const colors = { "--six-accent": profile.branding.primary_color || "#eeff66", "--six-teal": profile.branding.secondary_color || "#2c9db6" } as CSSProperties;
  const card = (product: StorefrontProductCardDto) => {
    const metadata = reference ? template6ReferenceCards[product.handle] : undefined;
    const saved = favorites.isFavorite(product.handle);
    const productUrl = `/products/${encodeURIComponent(product.handle)}`;
    const priceParts = product.price_lyd == null ? null : new Intl.NumberFormat(locale, {
      style: "currency", currency: reference ? "aed" : currency, currencyDisplay: english ? "code" : "symbol",
    }).formatToParts(product.price_lyd);
    return <article className={`six-product six-product--${product.handle}${category ? "" : " six-product--home"}`} key={product.handle}>
      <div className="six-product__media">
        <div {...editor.target(`product.${product.handle}`, product.title)}>
          <StorefrontLink to={`/products/${encodeURIComponent(product.handle)}`} ariaLabel={t(`View ${product.title}`, `عرض ${product.title}`)}>
            {product.thumbnail_url ? <img src={product.thumbnail_url} alt={product.title} width="760" height="760" loading="lazy" /> : <span className="six-product__no-photo">{product.title}</span>}
          </StorefrontLink>
        </div>
        <button type="button" className="six-product__favorite" aria-label={english ? `${saved ? "Remove" : "Save"} ${product.title}${saved ? " from wishlist" : " to wishlist"}` : `${saved ? "إزالة" : "حفظ"} ${product.title} ${saved ? "من المفضلة" : "في المفضلة"}`} aria-pressed={saved}
          onClick={() => { favorites.toggleFavorite(product); setNotice(saved ? t("Removed from your wishlist", "تمت الإزالة من المفضلة") : t("Saved to your wishlist", "تم الحفظ في المفضلة")); }}>
          {saved ? <PiHeartFill /> : <PiHeart />}
        </button>
        {category && <span className="six-product__price">{product.price_lyd != null ? money(product.price_lyd) : t("View price", "عرض السعر")}</span>}
      </div>
      <div className="six-product__body">
      <p className="six-product__location">{!category && (metadata?.location ? <PiMapPin aria-hidden="true" /> : (product.category || product.brand) ? <PiTag aria-hidden="true" /> : null)}<span>{metadata?.location ?? (product.category ? productCategory(product.category) : product.brand)}</span>{category && metadata && <PiSealCheckFill aria-label={t("Sample verified badge", "شارة توثيق تجريبية")} />}</p>
      <div className="six-product__caption"><h3 {...editor.target(`product.${product.handle}`, product.title)}><StorefrontLink to={`/products/${encodeURIComponent(product.handle)}`}>{product.title}</StorefrontLink></h3>
        {metadata && <span className="six-product__rating">{!category && <PiStarFill aria-label={t("Sample rating", "تقييم تجريبي")} />}{metadata.rating}{category && <PiStarFill aria-label={t("Sample rating", "تقييم تجريبي")} />}</span>}
      </div>
      {!category && <>
        <div className="six-product__amount">
          {priceParts ? <bdi>{priceParts.map((part, index) => <span className={`six-price-${part.type}`} key={index}>{part.value}</span>)}</bdi> : <span>{t("View price", "عرض السعر")}</span>}
        </div>
        <StorefrontLink className="six-product__cart-action" to={productUrl} ariaLabel={t(`Add ${product.title} to cart — choose options`, `إضافة ${product.title} إلى السلة، اختر الخيارات`)}><PiShoppingCart aria-hidden="true" /><span>{t("Add to Cart", "أضف إلى السلة")}</span></StorefrontLink>
      </>}
      </div>
    </article>;
  };

  return <div className={`template-six-home${category ? " template-six-home--category" : ""}`} dir={english ? "ltr" : "rtl"} lang={english ? "en" : "ar"} style={colors} data-reference={reference ? "true" : "false"}>
    <img className="six-home-background" src={editor.value("home.promotion_image_url", home.promotion_image_url)} alt="" width="864" height="1821" {...editor.target("home.promotion_image_url", "home background")} />
    {category ? <header className="six-category-header">
      <button type="button" aria-label={t("Back to Explore", "العودة إلى الاستكشاف")} onClick={() => navigate("/categories")}><PiCaretLeft /></button>
      <div><h1 {...(selectedCategory ? editor.target(`category.${selectedCategory.slug}.name`, "category name") : {})}>{categoryTitle}</h1><p>{t("Find your next favorite.", "اكتشف منتجك المفضل القادم.")}</p></div>
      <button type="button" aria-label={t("Open cart", "فتح السلة")} onClick={() => navigate("/cart")}><PiShoppingCart /></button>
    </header> : <><header className="six-header">
      <div className="six-header__copy"><h1><span {...editor.target("home.heading", "home greeting")}>{text("heading")}</span><img src="/assets/template-6/wave-v2.webp" alt="" width="80" height="80" /></h1>
        <p {...editor.target("home.statement", "home subtitle")}>{text("statement")}</p></div>
      <button type="button" className="six-header__bell" aria-label={t("Notifications", "الإشعارات")} onClick={() => setPanel("notifications")}><PiBell />{reference && <i />}</button>
      <button type="button" className="six-header__avatar" aria-label={t("Your profile", "حسابك")} onClick={() => navigate("/account")}>
        {reference ? <img src={editor.value("home.image_url", home.image_url)} alt="" width="118" height="118" {...editor.target("home.image_url", "profile photograph")} /> : profile.branding.logo_url ? <img src={profile.branding.logo_url} alt={profile.name} /> : <PiUser />}
      </button>
    </header>

    <section className="six-creators" aria-label={t("Explore collections", "اكتشف المجموعات")}>
      <h2 {...editor.target("home.categories_heading", "collections heading")}>{text("categories_heading")}</h2>
      <div className="six-creators__rail">
        {reference && <button type="button" className="six-creator six-creator--you" onClick={() => setPanel("story")}>
          <span className="six-creator__ring"><img src={asset("creator-you")} alt={t("Your sample story", "قصتك التجريبية")} width="136" height="136" /><span className="six-creator__add"><PiPlus /></span></span><span>{t("You", "أنت")}</span>
        </button>}
        {categories.map((item, index) => <button type="button" className="six-creator" key={item.id} aria-label={t(`Explore ${categoryName(item)}`, `اكتشف ${categoryName(item)}`)} onClick={() => setCategory(item.slug)}>
          <span className="six-creator__ring">{item.image_url ? <img src={editor.value(`category.${item.slug}.image`, item.image_url)} alt="" width="136" height="136" {...editor.target(`category.${item.slug}.image`, `${item.name.en} image`)} /> : <PiCompass />}</span>
          <span {...editor.target(`category.${item.slug}.name`, "collection name")}>{reference ? ["Alex H.", "David W.", "Emma K."][index] ?? categoryName(item) : categoryName(item)}{reference && <PiSealCheckFill />}</span>
        </button>)}
      </div>
    </section></>}

    <form className="six-search" role="search" onSubmit={event => { event.preventDefault(); search.current?.blur(); }}>
      <PiMagnifyingGlass aria-hidden="true" /><input ref={search} type="search" aria-label={t("Search items, sellers, or brands", "البحث عن المنتجات أو البائعين أو العلامات")} value={query} onChange={event => setQuery(event.target.value)} placeholder={text("eyebrow")} {...editor.target("home.eyebrow", "search placeholder")} />
      <button type="button" aria-label={t("Filter products", "تصفية المنتجات")} onClick={() => setPanel("filters")}><TbFilterSearch /></button>
    </form>
    <section className="six-discover" aria-labelledby="six-discover-title">
      <div className="six-section-heading"><h2 id="six-discover-title" {...(!category ? editor.target("home.products_heading", "discovery heading") : {})}>{category ? status === "ready" ? (english ? `${visible.length} ${visible.length === 1 ? "item" : "items"}` : `عدد المنتجات: ${visible.length}`) : t("Collection", "المجموعة") : text("products_heading")}</h2>
        {category ? <button type="button" onClick={() => navigate("/categories")}>{t("All categories", "جميع الفئات")}<PiCaretRight /></button> : <button type="button" onClick={() => navigate("/products")}><span {...editor.target("home.view_all_label", "see all label")}>{text("view_all_label")}</span><PiCaretRight /></button>}
      </div>
      <div className="six-filters" aria-label={t("Product filters", "فلاتر المنتجات")}>{filters.map(item => <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? "is-active" : ""} onClick={() => {
        if (item === "Verified Sellers" && !reference) { setPanel("nearby"); return; }
        setFilter(item);
      }}>{english ? item : arabicFilters[item]}</button>)}</div>
      <div className={`six-products${category ? " six-products--category" : ""}${visible.length === 1 ? " six-products--single" : ""}`} aria-busy={status === "loading"}>
        {status === "ready" && visible.length > 0 ? category ? visible.map(card) : <><div className="six-products__column">{visible.filter((_, index) => index % 2 === 0).map(card)}</div><div className="six-products__column">{visible.filter((_, index) => index % 2 === 1).map(card)}
        </div></> :
          <div className="six-empty" role="status"><h3>{status === "loading" ? t("Finding your next favorite…", "جارٍ تحميل المنتجات…") : status === "error" ? t("We couldn’t load the collection", "تعذّر تحميل المجموعة") : category && !hasFilters ? t("No items in this category yet", "لا توجد منتجات في هذه الفئة بعد") : t("No matching items", "لا توجد منتجات مطابقة")}</h3>
            {status !== "loading" && <button type="button" onClick={status === "error" ? () => setReload(value => value + 1) : category && !hasFilters ? () => navigate("/categories") : reset}>{status === "error" ? t("Try again", "حاول مجدداً") : category && !hasFilters ? t("Browse categories", "تصفّح الفئات") : t("Clear filters", "مسح الفلاتر")}</button>}
          </div>}
      </div>
    </section>

    {notice && <p className="six-toast" role="status">{notice}</p>}
    <dialog ref={dialog} className="six-dialog" aria-labelledby="six-dialog-title" onCancel={() => setPanel(null)} onClose={() => setPanel(null)}>
      <button type="button" className="six-dialog__close" aria-label={t("Close", "إغلاق")} onClick={() => setPanel(null)}><PiX /></button>
      <h2 id="six-dialog-title">{panel === "filters" ? t("Find your favorites", "ابحث عن مفضلاتك") : panel === "notifications" ? t("Notifications", "الإشعارات") : panel === "story" ? t("Your collection", "مجموعتك") : t("Discover nearby", "اكتشف ما حولك")}</h2>
      {panel === "filters" ? <form onSubmit={event => { event.preventDefault(); setPanel(null); }}>
        <label>{t("Collection", "المجموعة")}<select value={selectedCategory?.slug ?? category} onChange={event => setCategory(event.target.value)}><option value="">{t("All collections", "جميع المجموعات")}</option>{categories.map(item => <option key={item.id} value={item.slug}>{categoryName(item)}</option>)}</select></label>
        <label>{t("Maximum price", "الحد الأقصى للسعر")} ({reference ? t("AED · reference", "د.إ · تجريبي") : currency.toLowerCase() === "lyd" ? t("LYD", "د.ل") : currency.toUpperCase()})<input type="number" min="0" max="1000000" value={maxPrice ?? ""} onChange={event => setMaxPrice(event.target.value === "" ? null : Number(event.target.value))} placeholder={t("Any price", "أي سعر")} /></label>
        <button type="submit">{t("Show items", "عرض المنتجات")}</button><button type="button" onClick={reset}>{t("Reset filters", "إعادة ضبط الفلاتر")}</button>
      </form> : panel === "notifications" ? <p>{t("No store notifications are available.", "لا توجد إشعارات من المتجر حالياً.")}</p>
          : panel === "story" ? <><p>{t("Keep all your favorite finds together. Story publishing isn’t connected.", "احتفظ بكل مفضلاتك في مكان واحد. نشر القصص غير متاح حالياً.")}</p><button type="button" onClick={() => navigate("/favorites")}>{t("Open wishlist", "فتح المفضلة")}</button></>
            : <><p>{t("Location search and seller verification aren’t connected. Browse this store’s collection without sharing your location.", "البحث بالموقع وتوثيق البائعين غير متاحين حالياً. تصفّح مجموعة المتجر دون مشاركة موقعك.")}</p><button type="button" onClick={() => navigate("/products")}>{t("Browse all items", "تصفّح جميع المنتجات")}</button></>}
    </dialog>
  </div>;
}
