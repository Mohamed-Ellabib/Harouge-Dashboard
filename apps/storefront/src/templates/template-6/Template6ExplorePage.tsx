import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PiArrowRight, PiArrowUpRight, PiCaretLeft, PiMagnifyingGlass, PiMapPin, PiSlidersHorizontal, PiStorefront, PiX } from "react-icons/pi";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontProductCardDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import { loadUrbxShopCatalog } from "../urbx/urbx-shop-catalog";
import { template6CategoryHref, template6CategoryPhoto, template6ExploreArabicText, template6ExploreBrands, template6ExploreCopy, template6ExploreResults } from "./template-6-explore";
import "./template-6-home.css";
import "./template-6-explore.css";

const tabs = ["Categories", "Brands", "Stores"] as const;
const arabicTabs = { Categories: "الفئات", Brands: "العلامات", Stores: "المتاجر" };
export default function Template6ExplorePage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const locale = profile.locale;
  const english = locale === "en-LY";
  const t = (en: string, ar: string) => english ? en : ar;
  const editor = useGlowBeautyDesignEditor();
  const content = profile.storefront.content.brands;
  const text = (key: keyof typeof template6ExploreCopy) => english ? editor.value(`brands.${key}`, content[key]?.en ?? template6ExploreCopy[key]) : template6ExploreArabicText(key, content[key]);
  const [tab, setTab] = useState<typeof tabs[number]>("Categories");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [products, setProducts] = useState<StorefrontProductCardDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [stockedOnly, setStockedOnly] = useState(false);
  const [alphabetical, setAlphabetical] = useState(false);
  const [panel, setPanel] = useState<"filters" | "nearby" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    document.title = `${english ? "Explore" : "استكشف"} | ${profile.name}`;
    const controller = new AbortController(); setStatus("loading"); setProducts([]);
    void loadUrbxShopCatalog(controller.signal).then(items => {
      if (!controller.signal.aborted) { setProducts(items); setStatus("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [profile, reload, english]);
  useEffect(() => {
    if (panel) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); trigger.current?.focus(); }
  }, [panel]);
  const categories = useMemo(() => template6ExploreResults(content.items, products, deferredQuery, stockedOnly, alphabetical, locale), [content.items, products, deferredQuery, stockedOnly, alphabetical, locale]);
  const brands = useMemo(() => template6ExploreBrands(products, deferredQuery), [products, deferredQuery]);
  const storeMatches = profile.name.toLowerCase().includes(deferredQuery.trim().toLowerCase());
  const promotionImage = editor.value("brands.promotion_image_url", content.promotion_image_url ?? "");
  const colors = { "--six-accent": profile.branding.primary_color || "#eeff66", "--six-teal": profile.branding.secondary_color || "#2c9db6" } as CSSProperties;
  const reset = () => { setQuery(""); setStockedOnly(false); setAlphabetical(false); };

  return <div className="template-six-home template-six-explore" style={colors} dir={english ? "ltr" : "rtl"} lang={english ? "en" : "ar"}>
    <img className="six-home-background" src="/assets/template-6/home-background-v1.webp" alt="" />
    <header className="six-explore-header">
      <StorefrontLink to="/" ariaLabel={t("Back to home", "العودة إلى الرئيسية")}><PiCaretLeft /></StorefrontLink>
      <h1 {...editor.target("brands.heading", "Explore heading")}>{text("heading")}</h1>
      <button aria-label={t("Explore nearby", "استكشف ما حولك")} onClick={() => setPanel("nearby")}><PiMapPin /></button>
    </header>
    <p className="six-explore-subtitle" {...editor.target("brands.subheading", "Explore subtitle")}>{text("subheading")}</p>
    <div className="six-search six-explore-search">
      <PiMagnifyingGlass /><input aria-label={t("Search categories, brands, or stores", "البحث عن الفئات أو العلامات أو المتاجر")} placeholder={text("search_placeholder")} value={query} onChange={event => setQuery(event.target.value)} {...editor.target("brands.search_placeholder", "Explore search placeholder")} />
      <button aria-label={t("Filter categories", "تصفية الفئات")} aria-pressed={stockedOnly || alphabetical} onClick={() => setPanel("filters")}><PiSlidersHorizontal /></button>
    </div>
    <div className="six-explore-tabs" role="tablist" aria-label={t("Explore by", "طرق الاستكشاف")}>
      {tabs.map((item, index) => <button key={item} ref={element => { tabButtons.current[index] = element; }} id={`six-explore-tab-${item}`} role="tab" aria-selected={tab === item} aria-controls="six-explore-results" tabIndex={tab === item ? 0 : -1} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)} onKeyDown={event => {
        const next = event.key === (english ? "ArrowRight" : "ArrowLeft") ? (index + 1) % tabs.length : event.key === (english ? "ArrowLeft" : "ArrowRight") ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
        if (next !== null) { event.preventDefault(); setTab(tabs[next]); tabButtons.current[next]?.focus(); }
      }}>{english ? item : arabicTabs[item]}</button>)}
    </div>
    <section className="six-explore-results" id="six-explore-results" role="tabpanel" aria-labelledby={`six-explore-tab-${tab}`} aria-busy={status === "loading"}>
      <h2 {...(tab === "Categories" ? editor.target("brands.explore_label", "Category section heading") : {})}>{tab === "Categories" ? text("explore_label") : tab === "Brands" ? t("Browse by Brand", "تصفّح حسب العلامة") : t("Explore this Store", "استكشف هذا المتجر")}</h2>
      {status === "error" ? <div className="six-explore-empty" role="alert"><p>{t("We couldn’t load this store’s catalog.", "تعذّر تحميل منتجات المتجر.")}</p><button onClick={() => setReload(value => value + 1)}>{t("Try again", "حاول مجدداً")}</button></div>
        : status === "loading" ? <div className="six-explore-empty" role="status">{t("Loading the collection…", "جارٍ تحميل المجموعة…")}</div>
          : tab === "Categories" ? <>
            <div className="six-explore-grid">{categories.map(({ category, productQuery }) => {
              const photo = editor.value(`category.${category.slug}.banner`, template6CategoryPhoto(category) ?? "");
              const name = english ? editor.value(`category.${category.slug}.name`, category.name.en) : category.name.ar;
              return <StorefrontLink key={category.id} to={template6CategoryHref(category, productQuery)} className="six-explore-category" ariaLabel={t(`Explore ${name}`, `استكشف ${name}`)}>
                {photo && <img src={photo} alt="" width="764" height="686" {...editor.target(`category.${category.slug}.banner`, `${category.name.en} photo`)} />}
                <span className="six-explore-category__label" {...editor.target(`category.${category.slug}.name`, `${category.name.en} category`)}>{name}</span><span className="six-explore-category__arrow"><PiArrowUpRight /></span>
              </StorefrontLink>;
            })}</div>
            {!categories.length && <div className="six-explore-empty"><p>{t("No categories match your search.", "لا توجد فئات تطابق بحثك.")}</p><button onClick={reset}>{t("Clear filters", "مسح الفلاتر")}</button></div>}
          </> : tab === "Brands" ? <div className="six-explore-list">{brands.map(brand => <StorefrontLink key={brand.name} to={`/?q=${encodeURIComponent(brand.name)}`} className="six-explore-list__item">
            {brand.image ? <img src={brand.image} alt="" /> : <PiStorefront />}<div><h3>{brand.name}</h3><p>{english ? `${brand.count} ${brand.count === 1 ? "item" : "items"}` : `عدد المنتجات: ${brand.count}`}</p></div><PiArrowUpRight />
          </StorefrontLink>)}{!brands.length && <div className="six-explore-empty"><p>{t("No matching brands in this catalog.", "لا توجد علامات مطابقة في هذا المتجر.")}</p><button onClick={reset}>{t("Clear search", "مسح البحث")}</button></div>}</div>
            : <div className="six-explore-list">{storeMatches ? <StorefrontLink to="/" className="six-explore-list__item">{profile.branding.logo_url ? <img src={profile.branding.logo_url} alt="" /> : <PiStorefront />}<div><h3>{profile.name}</h3><p>{t("Browse our collection", "تصفّح مجموعتنا")}</p></div><PiArrowUpRight /></StorefrontLink> : <div className="six-explore-empty"><p>{t("No matching store.", "لا يوجد متجر مطابق.")}</p><button onClick={reset}>{t("Clear search", "مسح البحث")}</button></div>}<p className="six-explore-store-note">{t(`You’re browsing ${profile.name}. Nearby-store discovery isn’t connected.`, `أنت تتصفّح ${profile.name}. اكتشاف المتاجر القريبة غير متاح حالياً.`)}</p></div>}
    </section>
    {promotionImage && <section className="six-explore-promotion" aria-label={t("Fresh finds", "وصل حديثاً")}>
      <img src={promotionImage} alt="" width="1564" height="380" {...editor.target("brands.promotion_image_url", "Fresh Finds banner image")} />
      <div><h2 {...editor.target("brands.promotion_heading", "Fresh Finds heading")}>{text("promotion_heading")}</h2><p {...editor.target("brands.promotion_subheading", "Fresh Finds subtitle")}>{text("promotion_subheading")}</p>
        <StorefrontLink to="/?filter=new"><span {...editor.target("brands.view_all_label", "Discover button label")}>{text("view_all_label")}</span><PiArrowRight /></StorefrontLink></div>
    </section>}
    <dialog ref={dialog} className="six-dialog" aria-labelledby="six-explore-dialog-title" onCancel={() => setPanel(null)} onClose={() => setPanel(null)}>
      <button className="six-dialog__close" aria-label={t("Close", "إغلاق")} onClick={() => setPanel(null)}><PiX /></button><h2 id="six-explore-dialog-title">{panel === "filters" ? t("Explore filters", "فلاتر الاستكشاف") : t("Discover nearby", "اكتشف ما حولك")}</h2>
      {panel === "filters" ? <><label className="six-explore-checkbox"><input type="checkbox" checked={stockedOnly} onChange={event => setStockedOnly(event.target.checked)} /> {t("Only categories with products", "الفئات التي تحتوي على منتجات فقط")}</label><label>{t("Category order", "ترتيب الفئات")}<select value={alphabetical ? "alphabetical" : "featured"} onChange={event => setAlphabetical(event.target.value === "alphabetical")}><option value="featured">{t("Featured", "المميزة")}</option><option value="alphabetical">{t("A–Z", "أبجدياً")}</option></select></label><button onClick={() => setPanel(null)}>{t("Show results", "عرض النتائج")}</button><button onClick={reset}>{t("Reset filters", "إعادة ضبط الفلاتر")}</button></>
        : <><p>{t("Location search isn’t connected. Browse this store’s collection without sharing your location.", "البحث بالموقع غير متاح حالياً. تصفّح مجموعة المتجر دون مشاركة موقعك.")}</p><button onClick={() => navigate("/")}>{t("Browse all items", "تصفّح جميع المنتجات")}</button></>}
    </dialog>
  </div>;
}
