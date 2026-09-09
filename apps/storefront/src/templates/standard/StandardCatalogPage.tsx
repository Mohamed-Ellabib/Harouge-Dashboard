import { useEffect, useState } from "react";
import { fetchStorefrontCatalog } from "../../api/storefront-api";
import { useFavorites } from "../../commerce/FavoritesContext";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import { formatStorefrontMoney } from "../../lib/money";
import type { ConfiguredStorefrontProfileDto, StorefrontProductCardDto } from "../../types";
import { StandardProductCard } from "./StandardMobileHomePage";

export default function StandardCatalogPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const location = useStorefrontLocation();
  const category = profile.storefront.content.brands.items.find(item => item.slug === new URLSearchParams(location.search).get("category"));
  const [products, setProducts] = useState<StorefrontProductCardDto[]>([]);
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("q") ?? "");
  const [message, setMessage] = useState("Loading products…");
  const favorites = useFavorites();
  useEffect(() => {
    const controller = new AbortController();
    void fetchStorefrontCatalog({ limit: 24, signal: controller.signal }).then(result => { setProducts(result.products); setMessage(result.count ? "" : "No products yet."); }).catch(() => { if (!controller.signal.aborted) setMessage("Unable to load products. Try again."); });
    return () => controller.abort();
  }, [profile]);
  const visible = products.filter(product => (!category || (product.category ?? product.brand) === category.name.en) && product.title.toLowerCase().includes(query.toLowerCase()));
  return <div className="standard-mobile-home standard-catalog-page" style={{ paddingBottom: 115 }}>
    <header className="standard-section-heading"><h1>{category?.name.en ?? "All Products"}</h1><StorefrontLink to="/">Home</StorefrontLink></header>
    <label className="standard-search"><input aria-label="Search products" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products…" /></label>
    <p role="status">{message || (!visible.length ? "No matching products." : "")}</p>
    <div className="standard-arrivals__grid">{visible.map(product => <StandardProductCard key={product.handle} size="arrival" favorite={favorites.isFavorite(product.handle)} onToggleFavorite={() => favorites.toggleFavorite(product)} product={{ id: product.handle, name: product.title, image: product.thumbnail_url ?? "", price: product.price_lyd == null ? "Price unavailable" : formatStorefrontMoney(product.price_lyd, "lyd", profile.locale), reviews: 0, href: `/products/${encodeURIComponent(product.handle)}`, source: product }} />)}</div>
  </div>;
}
