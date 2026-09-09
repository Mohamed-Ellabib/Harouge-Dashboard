import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiCaretDown, PiCaretLeft, PiCaretRight, PiCheck, PiHeart, PiHeartFill, PiMagnifyingGlass, PiSealCheckFill, PiSlidersHorizontal, PiStarFill, PiX } from "react-icons/pi";
import { useFavorites } from "../../commerce/FavoritesContext";
import { useOptionalCart } from "../../commerce/CartContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import { formatStorefrontMoney } from "../../lib/money";
import type { ConfiguredStorefrontProfileDto, StorefrontProductCardDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import { loadUrbxShopCatalog } from "../urbx/urbx-shop-catalog";
import { template6ConfirmationReference } from "./template-6-confirmation";
import { template6ExploreCategoryLabel } from "./template-6-explore";
import "./template-6-home.css";
import "./template-6-checkout.css";
import "./template-6-favorites.css";

const categories = ["All", "Clothing", "Shoes", "Accessories"] as const;
type Category = typeof categories[number];
const arabicCategories: Record<Category, string> = { All: "الكل", Clothing: "الملابس", Shoes: "الأحذية", Accessories: "الإكسسوارات" };
const arabicLocations: Record<string, string> = { "Dubai Marina": "دبي مارينا", "Downtown Dubai": "وسط دبي", "New York City": "مدينة نيويورك" };
type Sort = "recent" | "oldest" | "price-asc" | "price-desc" | "title";
type ReferenceCards = Record<string, { location: string; rating: string }>;

function matchesCategory(product: StorefrontProductCardDto, category: Category) {
  if (category === "All") return true;
  const text = `${product.category ?? ""} ${product.title}`.toLowerCase();
  if (category === "Shoes") return /\b(shoes?|sneakers?|boots?|footwear|sandals?|trainers?)\b|أحذية|احذية/.test(text);
  if (category === "Accessories") return /\b(accessories|accessory|bags?|watches|watch|jewel\w*|sunglasses|caps?|hats?|belts?)\b|اكسسوارات|إكسسوارات|حقائب/.test(text);
  return /\b(clothing|apparel|men|women|streetwear|hoodies?|jackets?|shirts?|tees?|tops?|bottoms?|pants|jeans|dresses|dress|skirts?|knitwear|essentials)\b|ملابس/.test(text);
}

export default function Template6FavoritesPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const locale = profile.locale;
  const english = locale === "en-LY";
  const t = (en: string, ar: string) => english ? en : ar;
  const categoryLabel = (value: Category) => english ? value : arabicCategories[value];
  const productCategory = (value: string | null | undefined) => {
    if (!value) return "";
    const category = profile.storefront.content.brands.items.find(item => [item.slug, item.name.en, item.name.ar].includes(value));
    return template6ExploreCategoryLabel(category?.name ?? { en: value, ar: value }, locale);
  };
  const { favorites, toggleFavorite } = useFavorites();
  const cart = useOptionalCart();
  const editor = useGlowBeautyDesignEditor();
  const location = useStorefrontLocation();
  const reference = template6ConfirmationReference(import.meta.env.DEV, isVisualPreviewEnabled(), isStorefrontEditorPreviewEnabled(), location.search);
  const [referenceCards, setReferenceCards] = useState<ReferenceCards>({});
  const [catalog, setCatalog] = useState<StorefrontProductCardDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [sort, setSort] = useState<Sort>("recent");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const currency = cart?.capability.online_checkout.currency_code ?? "lyd";
  const money = (value: number) => reference && english ? `AED ${value.toFixed(2)}` : formatStorefrontMoney(value, reference ? "aed" : currency, locale);
  const colors = { "--six-accent": profile.branding.primary_color || "#eeff66" } as CSSProperties;

  useEffect(() => { document.title = `${english ? "My favorites" : "المفضلة"} | ${profile.name}`; }, [profile.name, english]);
  useEffect(() => {
    if (!reference) return;
    let active = true;
    void import("./template-6-preview-data").then(module => { if (active) setReferenceCards(module.template6ReferenceCards); }).catch(() => {});
    return () => { active = false; };
  }, [reference]);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    void loadUrbxShopCatalog(controller.signal).then(products => {
      if (!controller.signal.aborted) { setCatalog(products); setStatus("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [profile.handle, profile.storefront, retry]);
  useEffect(() => {
    if (filtersOpen) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); trigger.current?.focus(); }
  }, [filtersOpen]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 2400); return () => window.clearTimeout(timer); }, [notice]);

  // Refresh saved cards from the complete Store catalog; never show stale prices
  // or manufacture favorites when a customer deliberately empties their list.
  const byHandle = new Map(catalog.map(product => [product.handle, product]));
  const saved = favorites.flatMap(product => { const current = byHandle.get(product.handle); return current ? [current] : []; });
  const unavailable = status === "ready" ? favorites.length - saved.length : 0;
  const search = query.trim().toLowerCase();
  const visible = saved.filter(product => matchesCategory(product, category)
    && [product.title, product.subtitle, product.category, productCategory(product.category), product.brand].join(" ").toLowerCase().includes(search)
    && (maxPrice === null || (product.price_lyd != null && product.price_lyd <= maxPrice)));
  if (sort === "oldest") visible.reverse();
  else if (sort === "title") visible.sort((a, b) => a.title.localeCompare(b.title, locale));
  else if (sort.startsWith("price")) visible.sort((a, b) => a.price_lyd == null ? b.price_lyd == null ? 0 : 1 : b.price_lyd == null ? -1 : sort === "price-asc" ? a.price_lyd - b.price_lyd : b.price_lyd - a.price_lyd);
  const selectedProducts = favorites.filter(product => selected.includes(product.handle));
  const reset = () => { setQuery(""); setCategory("All"); setMaxPrice(null); setSort("recent"); };
  const toggleSelection = (handle: string) => setSelected(current => current.includes(handle) ? current.filter(value => value !== handle) : [...current, handle]);
  const removeSelected = () => {
    selectedProducts.forEach(toggleFavorite);
    setNotice(t(`${selectedProducts.length} ${selectedProducts.length === 1 ? "item" : "items"} removed from favorites`, `تمت إزالة ${selectedProducts.length} من المنتجات من المفضلة`));
    setSelected([]); setSelecting(false);
  };
  const card = (product: StorefrontProductCardDto) => {
    const metadata = reference ? referenceCards[product.handle] : undefined;
    const image = product.thumbnail_url ? <img src={product.thumbnail_url} alt={product.title} width="760" height="760" loading="lazy" /> : <span className="six-product__no-photo">{product.title}</span>;
    return <article className={`six-product six-product--${product.handle}`} key={product.handle}>
      <div className="six-product__media">
        <div {...editor.target(`product.${product.handle}`, product.title)}>{selecting
          ? <button type="button" className="six-favorite-select-image" aria-label={t(`Select ${product.title}`, `تحديد ${product.title}`)} aria-pressed={selected.includes(product.handle)} onClick={() => toggleSelection(product.handle)}>{image}</button>
          : <StorefrontLink to={`/products/${encodeURIComponent(product.handle)}`} ariaLabel={t(`View ${product.title}`, `عرض ${product.title}`)}>{image}</StorefrontLink>}</div>
        <button className={`six-product__favorite${selecting ? " six-favorite-checkbox" : ""}`} type="button" aria-label={selecting ? t(`Select ${product.title}`, `تحديد ${product.title}`) : t(`Remove ${product.title} from favorites`, `إزالة ${product.title} من المفضلة`)} aria-pressed={selecting ? selected.includes(product.handle) : true}
          onClick={() => { if (selecting) toggleSelection(product.handle); else { toggleFavorite(product); setNotice(t("Removed from your favorites", "تمت الإزالة من المفضلة")); } }}>
          {selecting ? selected.includes(product.handle) ? <PiCheck /> : <span className="six-favorite-checkbox__empty" /> : <PiHeartFill />}
        </button>
        <span className="six-product__price" {...editor.target(`product.${product.handle}`, "product price")}>{product.price_lyd != null ? money(product.price_lyd) : t("View price", "عرض السعر")}</span>
      </div>
      <p className="six-product__location">{metadata?.location ? (english ? metadata.location : arabicLocations[metadata.location] ?? metadata.location) : product.category ? productCategory(product.category) : product.brand}{metadata && <PiSealCheckFill aria-label={t("Sample verified badge", "شارة توثيق تجريبية")} />}</p>
      <div className="six-product__caption"><h3 {...editor.target(`product.${product.handle}`, product.title)}><StorefrontLink to={`/products/${encodeURIComponent(product.handle)}`}>{product.title}</StorefrontLink></h3>{metadata && <span className="six-product__rating">{metadata.rating}<PiStarFill aria-label={t("Sample rating", "تقييم تجريبي")} /></span>}</div>
    </article>;
  };

  return <section className="template-six-home template-six-favorites" style={colors} lang={english ? "en" : "ar"} dir={english ? "ltr" : "rtl"} aria-labelledby="six-favorites-title">
    <img className="six-home-background" src="/assets/template-6/home-background-v1.webp" alt="" />
    <header className="six-favorites-header"><StorefrontLink to="/account" ariaLabel={t("Back to profile", "العودة إلى الحساب")}><PiCaretLeft /></StorefrontLink><h1 id="six-favorites-title">{t("MY FAVORITES", "المفضلة")}</h1><button type="button" aria-pressed={selecting} onClick={() => { setSelecting(value => !value); setSelected([]); }}>{selecting ? t("Done", "تم") : t("Select", "تحديد")}</button></header>
    <p className="six-favorites-subtitle">{t("Your favorite finds, all in one place.", "كل منتجاتك المفضلة في مكان واحد.")}</p>
    <form className="six-search six-favorites-search" role="search" onSubmit={event => event.preventDefault()}><PiMagnifyingGlass aria-hidden="true" /><input type="search" aria-label={t("Search your favorites", "البحث في المفضلة")} placeholder={t("Search your favorites", "ابحث في مفضلاتك")} value={query} onChange={event => setQuery(event.target.value)} /><button type="button" aria-label={t("Filter favorites", "تصفية المفضلة")} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}><PiSlidersHorizontal /></button></form>
    <div className="six-favorites-summary"><h2>{english ? `${favorites.length} saved ${favorites.length === 1 ? "item" : "items"}` : `المنتجات المحفوظة: ${favorites.length}`}</h2><label><select aria-label={t("Sort favorites", "ترتيب المفضلة")} value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="recent">{t("Recently saved", "المحفوظة حديثاً")}</option><option value="oldest">{t("Oldest saved", "الأقدم حفظاً")}</option><option value="price-asc">{t("Price: low to high", "السعر: من الأقل إلى الأعلى")}</option><option value="price-desc">{t("Price: high to low", "السعر: من الأعلى إلى الأقل")}</option><option value="title">{t("Name: A–Z", "الاسم: أبجدياً")}</option></select><PiCaretDown aria-hidden="true" /></label></div>
    <div className="six-favorites-categories" aria-label={t("Favorite categories", "فئات المفضلة")}>{categories.map(value => <button type="button" key={value} className={category === value ? "is-active" : undefined} aria-pressed={category === value} onClick={() => setCategory(value)}>{categoryLabel(value)}</button>)}</div>
    {selecting && <div className="six-favorites-selection"><span role="status">{t(`${selectedProducts.length} selected`, `تم تحديد ${selectedProducts.length}`)}</span><button type="button" onClick={() => setSelected(visible.map(product => product.handle))}>{t("Select shown", "تحديد المعروض")}</button><button type="button" disabled={!selectedProducts.length} onClick={removeSelected}>{t("Remove selected", "إزالة المحدد")}</button></div>}
    {maxPrice !== null && <button className="six-favorites-price-filter" type="button" onClick={() => setMaxPrice(null)}>{t("Up to", "حتى")} {money(maxPrice)}<PiX aria-label={t("Clear price filter", "إلغاء تصفية السعر")} /></button>}
    <div className="six-products six-favorites-products" aria-busy={status === "loading" && favorites.length > 0}>
      {!favorites.length ? <div className="six-empty" role="status"><PiHeart /><h3>{t("Your favorites are waiting", "مفضلاتك بانتظارك")}</h3><p>{t("Tap a heart while exploring to save a find here.", "اضغط على القلب أثناء التصفح لحفظ المنتجات هنا.")}</p><StorefrontLink to="/">{t("Explore the collection", "استكشف المجموعة")}</StorefrontLink></div>
        : status !== "ready" ? <div className="six-empty" role="status"><h3>{status === "loading" ? t("Loading your favorites…", "جارٍ تحميل المفضلة…") : t("Couldn’t refresh your favorites", "تعذّر تحديث المفضلة")}</h3>{status === "error" && <button type="button" onClick={() => setRetry(value => value + 1)}>{t("Try again", "حاول مجدداً")}</button>}</div>
          : visible.length ? <><div className="six-products__column">{visible.filter((_, index) => index % 2 === 0).map(card)}</div><div className="six-products__column">{visible.filter((_, index) => index % 2 === 1).map(card)}</div></>
            : <div className="six-empty" role="status"><PiHeart /><h3>{t("No matching favorites", "لا توجد مفضلات مطابقة")}</h3><p>{t("Try another search or category.", "جرّب بحثاً آخر أو فئة أخرى.")}</p><button type="button" onClick={reset}>{t("Clear filters", "مسح الفلاتر")}</button></div>}
    </div>
    {unavailable > 0 && <p className="six-favorites-unavailable" role="status">{t(`${unavailable} saved ${unavailable === 1 ? "item is" : "items are"} no longer in this store’s catalog.`, `عدد المنتجات المحفوظة التي لم تعد متاحة في المتجر: ${unavailable}.`)}</p>}
    <StorefrontLink className="six-favorites-continue" to="/categories">{t("Keep exploring", "واصل الاستكشاف")}<PiCaretRight aria-hidden="true" /></StorefrontLink>
    {notice && <p className="six-toast six-favorites-toast" role="status">{notice}</p>}
    <dialog ref={dialog} className="six-dialog" aria-labelledby="six-favorites-filter-title" onCancel={event => { event.preventDefault(); setFiltersOpen(false); }}><button type="button" className="six-dialog__close" aria-label={t("Close favorites filters", "إغلاق فلاتر المفضلة")} onClick={() => setFiltersOpen(false)}><PiX /></button><h2 id="six-favorites-filter-title">{t("Filter favorites", "تصفية المفضلة")}</h2><form onSubmit={event => { event.preventDefault(); setFiltersOpen(false); }}><label>{t("Category", "الفئة")}<select value={category} onChange={event => setCategory(event.target.value as Category)}>{categories.map(value => <option key={value} value={value}>{categoryLabel(value)}</option>)}</select></label><label>{t("Maximum price", "الحد الأقصى للسعر")} ({reference ? t("AED · reference", "د.إ · تجريبي") : currency.toLowerCase() === "lyd" ? t("LYD", "د.ل") : currency.toUpperCase()})<input type="number" min="0" max="1000000" step="0.01" placeholder={t("Any price", "أي سعر")} value={maxPrice ?? ""} onChange={event => setMaxPrice(event.target.value === "" ? null : Number(event.target.value))} /></label><button type="submit">{t("Show favorites", "عرض المفضلة")}</button><button type="button" onClick={reset}>{t("Reset filters", "إعادة ضبط الفلاتر")}</button></form></dialog>
  </section>;
}
