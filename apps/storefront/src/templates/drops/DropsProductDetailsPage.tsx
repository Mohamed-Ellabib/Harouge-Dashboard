import { useEffect, useState } from "react";
import {
  IoArrowBack,
  IoBagAddOutline,
  IoChatbubbleEllipsesOutline,
  IoChevronForward,
  IoCubeOutline,
  IoDocumentTextOutline,
  IoEllipsisVertical,
  IoHeart,
  IoHeartOutline,
  IoShareOutline,
  IoStar,
  IoSwapHorizontal,
} from "react-icons/io5";

import "./drops-product-details.css";
import { fetchStorefrontProductDetail, fetchStorefrontPurchaseOptions } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { navigate } from "../../lib/navigation";
import { formatStorefrontMoney } from "../../lib/money";
import type { StorefrontProfileDto, StorefrontProductDetailDto, StorefrontPurchaseOptionsDto } from "../../types";

const asset = (name: string) => `/assets/drops/${name}`;

const productViews = [
  { label: "Angled sneaker view", image: asset("product-green-hero.png") },
  { label: "Sneaker pair side view", image: asset("product-green-pair.png") },
  { label: "Sneaker pair rear view", image: asset("product-green-rear.png") },
  { label: "Sneaker pair top view", image: asset("product-green-top.png") },
  { label: "Sneaker gum outsole view", image: asset("product-green-outsole.png") },
] as const;

const sizes = ["US 4", "US 4.5", "US 5", "US 5.5", "US 6"] as const;

type DetailPanel = "product" | "shipping";

export function DropsProductDetailsPage({ profile, handle = "jordan-1-low-grey-toe" }: { profile?: StorefrontProfileDto; handle?: string } = {}) {
  const cart = useOptionalCart();
  const favorites = useOptionalFavorites();
  const [product, setProduct] = useState<StorefrontProductDetailDto | null>(null);
  const [purchase, setPurchase] = useState<StorefrontPurchaseOptionsDto | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    setProduct(null); setPurchase(null); setLoadError(""); setSelectedView(0);
    const currency = cart?.capability.online_checkout.currency_code;
    void Promise.all([fetchStorefrontProductDetail(handle, { signal: controller.signal }), currency ? fetchStorefrontPurchaseOptions(handle, currency, { signal: controller.signal }) : Promise.resolve(null)])
      .then(([detail, options]) => { if (controller.signal.aborted) return; setProduct(detail); setPurchase(options); setSelectedSize(options?.variants.find(v => v.available_for_sale)?.id ?? options?.variants[0]?.id ?? ""); })
      .catch(() => { if (!controller.signal.aborted) setLoadError("This sneaker is unavailable. Please try again."); });
    return () => controller.abort();
  }, [profile, handle, cart?.capability.online_checkout.currency_code]);
  const [selectedView, setSelectedView] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("US 4");
  const [favorite, setFavorite] = useState(false);
  const [openPanel, setOpenPanel] = useState<DetailPanel | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const views = profile ? (product?.image_urls.length ? product.image_urls : product?.thumbnail_url ? [product.thumbnail_url] : []).map((image, index) => ({ image, label: `Sneaker view ${index + 1}` })) : productViews;
  const name = profile ? product?.title ?? (loadError || "Loading sneaker…") : "Jordan 1 Low Grey Toe";
  const variant = purchase?.variants.find(v => v.id === selectedSize);
  const choices = profile ? (purchase?.variants ?? []).map(v => ({ value: v.id, label: v.title, available: v.available_for_sale })) : sizes.map(value => ({ value, label: value, available: true }));
  const toggleSaved = () => { if (profile && product) favorites?.toggleFavorite({ ...product, price_lyd: variant?.unit_price }); else setFavorite(value => !value); };
  const isSaved = profile ? favorites?.isFavorite(handle) : favorite;


  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = "Jordan 1 Low Grey Toe — DROPS Preview";
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.documentElement.classList.add("drops-preview-document");
    document.body.classList.add("drops-preview-document");

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDirection;
      document.documentElement.classList.remove("drops-preview-document");
      document.body.classList.remove("drops-preview-document");
    };
  }, []);

  const goBack = () => {
    navigate(profile ? "/products" : "/?preview=1&template=drops");
  };

  const togglePanel = (panel: DetailPanel) => {
    setOpenPanel((current) => current === panel ? null : panel);
  };

  const addToCart = async (checkout = false) => {
    if (!profile) { setLiveMessage(`${name} in ${selectedSize} added to your cart.`); return; }
    if (!variant?.available_for_sale || !cart || cart.pending) return;
    try { await cart.addItem(variant.id); setLiveMessage("Added to your cart."); if (checkout) navigate("/checkout"); }
    catch { setLiveMessage("Unable to add this sneaker. Please try again."); }
  };

  const buyNow = () => {
    void addToCart(true);
  };

  return (
    <div className="drops-product-page" dir="ltr" lang="en">
      <header className="drops-product-header">
        <button type="button" aria-label="Back to DROPS" onClick={goBack}>
          <IoArrowBack aria-hidden="true" />
        </button>
        <h1>Sneakers Detail</h1>
        <button
          type="button"
          aria-label={menuOpen ? "Close product menu" : "Open product menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <IoEllipsisVertical aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div className="drops-product-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                toggleSaved();
                setMenuOpen(false);
                setLiveMessage("Sneaker saved to favorites.");
              }}
            >
              <IoHeartOutline aria-hidden="true" /> Save sneaker
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setLiveMessage("Product link is ready to share.");
              }}
            >
              <IoShareOutline aria-hidden="true" /> Share product
            </button>
          </div>
        ) : null}
      </header>

      <main>
        <section className="drops-product-viewer" aria-label="Sneaker image viewer">
          <img
            data-glow-edit={profile ? `product.${handle}` : undefined}
            src={views[selectedView]?.image}
            alt={views[selectedView]?.label ?? name}
          />
          <button
            className="drops-product-rotate"
            type="button"
            aria-label="Show next sneaker angle"
            onClick={() => setSelectedView((current) => (current + 1) % Math.max(1, views.length))}
          >
            <IoSwapHorizontal aria-hidden="true" />
          </button>
        </section>

        <div className="drops-product-gallery" aria-label="Select sneaker view">
          {views.map((view, index) => (
            <button
              className={selectedView === index ? "is-selected" : ""}
              type="button"
              aria-label={view.label}
              aria-pressed={selectedView === index}
              key={view.label}
              onClick={() => setSelectedView(index)}
            >
              <img src={view.image} alt="" />
            </button>
          ))}
        </div>

        <section className="drops-product-copy" aria-labelledby="drops-product-name">
          <div className="drops-product-title-row">
            <h2 id="drops-product-name" data-glow-edit={profile ? `product.${handle}` : undefined}>{name}</h2>
            <button
              type="button"
              aria-label={isSaved ? "Remove sneaker from favorites" : "Save sneaker to favorites"}
              aria-pressed={isSaved}
              onClick={toggleSaved}
            >
              {isSaved ? <IoHeart aria-hidden="true" /> : <IoHeartOutline aria-hidden="true" />}
            </button>
          </div>
          <strong className="drops-product-price">{profile ? variant ? formatStorefrontMoney(variant.unit_price, purchase!.currency_code, profile.locale) : "Price unavailable" : "$14,200"}</strong>
          <div className="drops-product-facts" aria-label="Product facts">
            {profile ? <><span>{variant?.available_for_sale ? "In stock" : "Unavailable"}</span><span>Store collection</span><span>Select your size below</span></> : <><span>5 Pair Left</span><span>Sold 50</span><span><IoStar aria-hidden="true" /> <b>4.7</b> <em>(69 Reviews)</em></span></>}
          </div>
        </section>

        <section className="drops-product-sizes" aria-labelledby="drops-size-title">
          <header>
            <h2 id="drops-size-title">Select Size</h2>
            <button type="button" onClick={() => setLiveMessage("Size chart opened for DROPS sneakers.")}>Size chart</button>
          </header>
          <div>
            {choices.map((size) => (
              <button
                type="button"
                className={selectedSize === size.value ? "is-selected" : ""}
                aria-pressed={selectedSize === size.value}
                disabled={!size.available}
                key={size.value}
                onClick={() => setSelectedSize(size.value)}
              >
                {size.label}
              </button>
            ))}
          </div>
        </section>

        <section className="drops-product-accordions" aria-label="Product information">
          <div>
            <button
              type="button"
              aria-expanded={openPanel === "product"}
              aria-controls="drops-product-details-panel"
              onClick={() => togglePanel("product")}
            >
              <span><IoDocumentTextOutline aria-hidden="true" /></span>
              <b>Product Details</b>
              <IoChevronForward aria-hidden="true" />
            </button>
            {openPanel === "product" ? (
              <p id="drops-product-details-panel">{profile ? product?.description : "Premium low-top leather sneaker with cushioned support, breathable lining and durable gum-rubber traction."}</p>
            ) : null}
          </div>
          <div>
            <button
              type="button"
              aria-expanded={openPanel === "shipping"}
              aria-controls="drops-shipping-panel"
              onClick={() => togglePanel("shipping")}
            >
              <span><IoCubeOutline aria-hidden="true" /></span>
              <b>Shipping &amp; Returns</b>
              <IoChevronForward aria-hidden="true" />
            </button>
            {openPanel === "shipping" ? (
              <p id="drops-shipping-panel">{profile ? "Delivery options and fees are confirmed at checkout. Contact the store for its return policy." : "Free standard delivery in 3–5 business days, with easy returns within 14 days of delivery."}</p>
            ) : null}
          </div>
        </section>
        <p className="drops-product-live" role="status" aria-live="polite">{liveMessage}</p>
      </main>

      <footer className="drops-product-actions">
        <button
          type="button"
          aria-label="Chat with DROPS support"
          onClick={() => profile ? navigate("/contact") : setLiveMessage("DROPS support is ready to help.")}
        >
          <IoChatbubbleEllipsesOutline aria-hidden="true" />
        </button>
        <button type="button" disabled={Boolean(profile && (!variant?.available_for_sale || cart?.pending))} onClick={() => void addToCart()}>
          <IoBagAddOutline aria-hidden="true" />
          Add to Cart
        </button>
        <button type="button" disabled={Boolean(profile && (!variant?.available_for_sale || cart?.pending))} onClick={buyNow}>Buy Now</button>
      </footer>
    </div>
  );
}

export default DropsProductDetailsPage;
