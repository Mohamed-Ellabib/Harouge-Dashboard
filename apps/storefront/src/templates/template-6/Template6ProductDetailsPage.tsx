import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiBasket, PiCaretLeft, PiCaretRight, PiChatsTeardrop, PiMapPin, PiMinus, PiPlus, PiSealCheckFill, PiStarFill, PiStorefront, PiX } from "react-icons/pi";
import { LuPackageSearch } from "react-icons/lu";
import { fetchStorefrontProductDetail, fetchStorefrontPurchaseOptions, isStorefrontApiError } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { StoreContactLinks } from "../../components/StoreContactLinks";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontProductDetailDto, StorefrontPurchaseOptionsDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import { initialTemplate6Variant, productGallery, selectProductOption, template6QuantityLimit } from "./template-6-product";
import "./template-6-product.css";

type Panel = "size" | "photo" | "contact" | "reviews" | null;
export default function Template6ProductDetailsPage({ profile, handle }: { profile: ConfiguredStorefrontProfileDto; handle: string }) {
  const editor = useGlowBeautyDesignEditor();
  const cart = useOptionalCart();
  const location = useStorefrontLocation();
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const currency = cart?.capability.online_checkout.currency_code ?? "lyd";
  const available = cart?.capability.online_checkout.status === "available";
  const [product, setProduct] = useState<StorefrontProductDetailDto | null>(null);
  const [purchase, setPurchase] = useState<StorefrontPurchaseOptionsDto | null>(null);
  const [variantId, setVariantId] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [purchaseError, setPurchaseError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [buying, setBuying] = useState(false);
  const mutationLock = useRef(false);
  const [panel, setPanel] = useState<Panel>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const startTouch = useRef<number | null>(null);
  const images = product ? productGallery(product) : [];
  const imageIndex = Math.min(activeImage, Math.max(0, images.length - 1));
  const selected = purchase?.variants.find(variant => variant.id === variantId);
  const inCart = cart?.cart?.items.filter(item => item.variant_id === variantId).reduce((total, item) => total + item.quantity, 0) ?? 0;
  const quantityLimit = template6QuantityLimit(inCart);
  const selectedQuantity = Math.min(quantity, Math.max(1, quantityLimit));
  const purchaseDisabled = !available || !selected?.available_for_sale || buying || cart?.pending || cart?.restoring || quantityLimit === 0;
  const sizes = purchase?.options.find(option => option.name === "size")?.values ?? [];
  const colors = purchase?.options.find(option => option.name === "color")?.values ?? [];
  const productTarget = editor.target(`product.${handle}`, "product name, description, photos and prices");
  const money = (amount: number) => reference ? `AED ${amount.toFixed(2)}` : formatStorefrontMoney(amount, currency, "en-LY");
  const contactAvailable = Boolean(profile.contact.public_email || profile.contact.public_phone || profile.contact.whatsapp_number);
  const style = { "--six-product-accent": profile.branding.primary_color || "#eeff66", "--six-product-tint": profile.branding.secondary_color || "#2c9db6" } as CSSProperties;

  useEffect(() => {
    const controller = new AbortController();
    setProduct(null); setPurchase(null); setVariantId(""); setPurchaseError(false); setStatus("loading"); setActiveImage(0); setExpanded(false); setQuantity(1); setNotice("");
    const detail = fetchStorefrontProductDetail(handle, { signal: controller.signal });
    const choices = fetchStorefrontPurchaseOptions(handle, currency, { signal: controller.signal }).catch(() => {
      if (!controller.signal.aborted) setPurchaseError(true);
      return null;
    });
    void Promise.all([detail, choices]).then(([item, options]) => {
      if (controller.signal.aborted) return;
      setProduct(item); setPurchase(options); setVariantId(initialTemplate6Variant(options?.variants ?? [])?.id ?? ""); setStatus("ready");
    }).catch(error => {
      if (!controller.signal.aborted) setStatus(isStorefrontApiError(error) && error.code === "not_found" ? "missing" : "error");
    });
    return () => controller.abort();
  }, [handle, currency, profile, retry]);
  useEffect(() => { document.title = `${product?.title ?? "Product"} | ${profile.name}`; }, [product?.title, profile.name]);
  useEffect(() => { setImageFailed(false); }, [images[imageIndex]]);
  useEffect(() => {
    if (panel) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); trigger.current?.focus(); }
  }, [panel]);

  const addToCart = async (checkout = false) => {
    if (!cart || !selected || purchaseDisabled || mutationLock.current) return;
    mutationLock.current = true; setBuying(true); setNotice(""); cart.clearError();
    try {
      await cart.addItem(selected.id, selectedQuantity);
      setNotice(`${selectedQuantity} ${selectedQuantity === 1 ? "item" : "items"} added to cart.`);
      setQuantity(1);
      if (checkout) navigate("/checkout");
    }
    catch { /* Shared cart exposes the authoritative error. Do not navigate on failure. */ }
    finally { mutationLock.current = false; setBuying(false); }
  };
  const changeImage = (offset: number) => { if (images.length) setActiveImage(index => (index + offset + images.length) % images.length); };

  return <div className="template-six-product" style={style} dir="ltr" lang="en" data-state={status} data-money={reference ? "reference" : "store"}>
    <section className="six-product-gallery" aria-label="Product gallery" onTouchStart={event => { startTouch.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => {
      const end = event.changedTouches[0]?.clientX;
      if (startTouch.current !== null && end !== undefined && Math.abs(end - startTouch.current) > 50) changeImage(end < startTouch.current ? 1 : -1);
      startTouch.current = null;
    }}>
      <div className="six-product-photo" {...productTarget}>{images.length && !imageFailed
        ? <img src={images[imageIndex]} alt={`${product?.title}, view ${imageIndex + 1}`} width="1300" height="1209" {...{ fetchpriority: "high" }} onError={() => setImageFailed(true)} />
        : <p role="status">{status === "loading" ? "Loading product…" : "Image unavailable"}</p>}</div>
      <header className="six-product-header">
        <StorefrontLink to="/" className="six-product-glass" ariaLabel="Back to discovery"><PiCaretLeft /></StorefrontLink>
        <p>PRODUCT DETAILS</p>
        <StorefrontLink to="/cart" className="six-product-glass" ariaLabel="Open shopping basket"><PiBasket /></StorefrontLink>
      </header>
      {images.length > 1 && <div className="six-product-dots" role="group" aria-label="Choose a product photo">{images.map((src, index) => <button key={src} aria-label={`Show photo ${index + 1}`} aria-pressed={index === imageIndex} onClick={() => setActiveImage(index)}><span /></button>)}</div>}
      <button className="six-product-glass six-product-zoom" aria-label="Enlarge product photo" disabled={!images.length || imageFailed} onClick={() => setPanel("photo")}><LuPackageSearch /></button>
    </section>

    {status !== "ready" ? <section className="six-product-state" role="status"><h1>{status === "loading" ? "Loading product…" : status === "missing" ? "Product not found" : "This product couldn’t load"}</h1>{status === "error" && <button onClick={() => setRetry(value => value + 1)}>Try again</button>}<StorefrontLink to="/">Return to discovery</StorefrontLink></section> : product && <>
      <section className="six-product-information" aria-label="Product information">
        <div className="six-product-summary">
          <div><p className="six-product-location">{reference ? "Dubai Marina" : profile.name}</p><h1 {...productTarget}>{product.title}</h1></div>
          <strong className="six-product-price" {...productTarget}>{selected ? money(selected.unit_price) : "Price unavailable"}</strong>
          <button className="six-product-reviews" onClick={() => setPanel("reviews")}><PiStarFill />{reference ? <>4.9 <span />50 reviews</> : "Product reviews"}</button>
          <button className="six-product-chat" aria-label="Ask about this product" onClick={() => setPanel("contact")}><PiChatsTeardrop /></button>
        </div>
        <div className="six-product-seller">
          <div className="six-product-seller-logo">{reference || profile.branding.logo_url ? <img src={reference ? "/assets/template-6/zara-logo-v1.webp" : profile.branding.logo_url!} alt={reference ? "ZARA" : profile.name} /> : <PiStorefront />}</div>
          <div className="six-product-seller-copy"><h2>{reference ? "ZARA Brand Store" : profile.name}{reference && <PiSealCheckFill aria-label="Reference verified badge" />}</h2><p><PiMapPin />{reference ? "Dubai Marina" : "Shop this store"}</p></div>
          <StorefrontLink to="/" className="six-product-visit">Visit Store</StorefrontLink>
        </div>
        <div className="six-product-description"><h2>Product Description</h2>
          <p><span className={!expanded ? "six-product-description-preview" : ""} {...productTarget}>{product.description || "Contact the store for product details."}</span>{!expanded && " "}<button aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Read Less" : "Read More"}</button></p>
          {expanded && <div className="six-product-more"><p>Category: {product.category || product.subtitle || "General"}</p><StorefrontLink to="/delivery-returns">Delivery &amp; returns</StorefrontLink></div>}
        </div>
        {purchaseError && <p className="six-product-error" role="alert">Sizes and prices couldn’t load. <button onClick={() => setRetry(value => value + 1)}>Try again</button></p>}
        {sizes.length > 0 && <div className="six-product-size"><div className="six-product-size-heading"><h2>Size</h2><button onClick={() => setPanel("size")}>Size Guide <PiCaretRight /></button></div><div className="six-product-options" role="group" aria-label="Select size">{sizes.map(size => {
          const next = selectProductOption(purchase!.variants, selected, "size", size);
          return <button key={size} aria-pressed={selected?.options.size === size} disabled={!next || buying} onClick={() => { if (next) { setVariantId(next.id); setQuantity(1); setNotice(""); } }}>{size}</button>;
        })}</div></div>}
        {colors.length > 0 && <div className="six-product-size"><h2>Color</h2><div className="six-product-options" role="group" aria-label="Select color">{colors.map(color => {
          const next = selectProductOption(purchase!.variants, selected, "color", color);
          return <button key={color} aria-pressed={selected?.options.color === color} disabled={!next || buying} onClick={() => { if (next) { setVariantId(next.id); setQuantity(1); setNotice(""); } }}>{color}</button>;
        })}</div></div>}
        {!available && <p className="six-product-error">Online ordering is currently unavailable. <StorefrontLink to="/contact">Contact the store</StorefrontLink></p>}
        {cart?.error && <p className="six-product-error" role="alert">{cart.error}</p>}
      </section>
      <footer className="six-product-actions">
        <div className="six-product-quantity-row"><span>Quantity</span><div className="six-product-quantity" role="group" aria-label="Quantity to add">
          <button type="button" aria-label="Decrease quantity" disabled={purchaseDisabled || selectedQuantity <= 1} onClick={() => setQuantity(selectedQuantity - 1)}><PiMinus /></button>
          <output aria-label="Selected quantity">{selectedQuantity}</output>
          <button type="button" aria-label="Increase quantity" disabled={purchaseDisabled || selectedQuantity >= quantityLimit} onClick={() => setQuantity(selectedQuantity + 1)}><PiPlus /></button>
        </div></div>
        {quantityLimit === 0 && <p className="six-product-cart-notice" role="status">Maximum quantity is already in your cart.</p>}
        {notice && <p className="six-product-cart-notice" role="status">{notice}</p>}
        <button type="button" className="six-product-add" disabled={purchaseDisabled} onClick={() => void addToCart()}>{buying ? "ADDING…" : "ADD TO CART"}</button>
        <button type="button" className="six-product-buy" disabled={purchaseDisabled} onClick={() => void addToCart(true)}>{buying ? "ADDING…" : selected && !selected.available_for_sale ? "SOLD OUT" : "BUY IT NOW"}</button>
      </footer>
    </>}

    <dialog ref={dialog} className={`six-product-dialog${panel === "photo" ? " six-product-dialog--photo" : ""}`} aria-label={panel === "photo" ? "Product photo" : panel === "size" ? "Size guide" : panel === "reviews" ? "Product reviews" : "Contact the store"} onCancel={event => { event.preventDefault(); setPanel(null); }}>
      <button className="six-product-dialog-close" aria-label="Close dialog" onClick={() => setPanel(null)}><PiX /></button>
      {panel === "photo" ? <><img src={images[imageIndex]} alt={`${product?.title}, enlarged view ${imageIndex + 1}`} /><div className="six-product-dialog-paging"><button aria-label="Previous photo" onClick={() => changeImage(-1)}><PiCaretLeft /></button><span>{imageIndex + 1} / {images.length}</span><button aria-label="Next photo" onClick={() => changeImage(1)}><PiCaretRight /></button></div></>
        : panel === "size" ? <><h2>Size Guide</h2><p>Available sizes: {sizes.join(" · ")}</p><p>Contact the store for exact garment measurements and fit advice. Measurements have not been supplied for this product.</p><StoreContactLinks profile={profile} /><StorefrontLink to="/contact">Ask about sizing</StorefrontLink></>
        : panel === "reviews" ? <><h2>Product reviews</h2><p>{reference ? "The 4.9 rating and 50 reviews are reference-design samples, not customer submissions." : "Customer reviews are not connected for this store."}</p></>
        : <><h2>Ask about this product</h2><p>{contactAvailable ? "Choose a contact method to reach the store. Messages are not sent automatically." : "The store has not connected a chat service or added contact details yet."}</p><StoreContactLinks profile={profile} /><StorefrontLink to="/contact">Store contact information</StorefrontLink></>}
    </dialog>
  </div>;
}
