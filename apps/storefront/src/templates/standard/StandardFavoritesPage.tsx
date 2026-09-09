import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  IoHeartSharp,
  IoOptionsOutline,
  IoSearchOutline,
} from "react-icons/io5";

import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { formatStorefrontMoney } from "../../lib/money";
import { StorefrontLink } from "../../lib/navigation";
import type { StorefrontProductCardDto, StorefrontProfileDto } from "../../types";
import { standardRoute } from "./StandardMobileNavigation";
import "./standard-favorites.css";

type FavoriteCategory = string;
type FavoriteFilter = "All" | FavoriteCategory;
type FavoriteSort = "Newest" | "Price low to high" | "Price high to low";

type FavoriteProduct = {
  id: string;
  name: string;
  category: FavoriteCategory;
  image: string | null;
  price: number | null;
  rating: number;
  href?: string;
  source?: StorefrontProductCardDto;
};

const favoriteProducts: FavoriteProduct[] = [
  {
    id: "pastel-wrap-dress",
    name: "Pastel Wrap Dress",
    category: "Dresses",
    image: "/assets/standard/product-pastel-wrap-dress.webp",
    price: 129,
    rating: 4.8,
    href: "/products/pastel-wrap-dress?preview=1&template=standard",
  },
  {
    id: "ivory-lounge-set",
    name: "Ivory Lounge Set",
    category: "Dresses",
    image: "/assets/standard/arrival-cream-set.webp",
    price: 89,
    rating: 4.8,
  },
  {
    id: "heritage-leather-bag",
    name: "Heritage Leather Bag",
    category: "Bags",
    image: "/assets/standard/favorite-heritage-leather-bag.webp",
    price: 148,
    rating: 4.8,
  },
  {
    id: "classic-beige-heels",
    name: "Classic Beige Heels",
    category: "Shoes",
    image: "/assets/standard/cart-classic-beige-heels.webp",
    price: 96,
    rating: 4.8,
  },
  {
    id: "soft-striped-dress",
    name: "Soft Striped Dress",
    category: "Dresses",
    image: "/assets/standard/arrival-striped-dress.webp",
    price: 118,
    rating: 4.7,
  },
  {
    id: "chocolate-day-bag",
    name: "Chocolate Day Bag",
    category: "Bags",
    image: "/assets/standard/category-handbags.webp",
    price: 134,
    rating: 4.9,
  },
];

const filters: FavoriteFilter[] = ["All", "Dresses", "Bags", "Shoes"];
const sortOptions: FavoriteSort[] = [
  "Newest",
  "Price low to high",
  "Price high to low",
];

const formatPrice = (price: number) => `$${price.toFixed(2)}`;

export default function StandardFavoritesPage({ profile }: { profile?: StorefrontProfileDto } = {}) {
  const favoritesContext = useOptionalFavorites();
  const searchRef = useRef<HTMLInputElement>(null);
  const [savedIds, setSavedIds] = useState(
    () => new Set(favoriteProducts.map((product) => product.id)),
  );
  const [activeFilter, setActiveFilter] = useState<FavoriteFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<FavoriteSort>("Newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = profile ? `Favorites | ${profile.name}` : "My Favorites | Standard Storefront Preview";
    document.documentElement.classList.add("standard-preview-document");
    document.body.classList.add("standard-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove("standard-preview-document");
      document.body.classList.remove("standard-preview-document");
    };
  }, [profile]);

  const runtimeFavorites: FavoriteProduct[] = (favoritesContext?.favorites ?? []).map((product) => ({
    id: product.handle,
    name: product.title,
    category: product.category ?? "Other",
    image: product.thumbnail_url,
    price: product.price_lyd ?? null,
    rating: 0,
    href: standardRoute(`/products/${encodeURIComponent(product.handle)}`),
    source: product,
  }));

  const savedProducts = useMemo(
    () => profile ? runtimeFavorites : favoriteProducts.filter((product) => savedIds.has(product.id)),
    [profile, runtimeFavorites, savedIds],
  );
  const availableFilters = profile ? ["All", ...new Set(savedProducts.map(product => product.category))] : filters;

  const visibleProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matching = savedProducts.filter((product) => {
      const matchesFilter =
        activeFilter === "All" || product.category === activeFilter;
      const matchesSearch =
        !normalizedQuery || product.name.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesSearch;
    });

    if (sort === "Price low to high") {
      return [...matching].sort((left, right) => (left.price ?? Infinity) - (right.price ?? Infinity));
    }
    if (sort === "Price high to low") {
      return [...matching].sort((left, right) => (right.price ?? -Infinity) - (left.price ?? -Infinity));
    }
    return matching;
  }, [activeFilter, savedProducts, searchQuery, sort]);

  const removeFavorite = (product: FavoriteProduct) => {
    if (product.source && favoritesContext) {
      favoritesContext.toggleFavorite(product.source);
      setAnnouncement(`${product.name} removed from saved items`);
      return;
    }
    setSavedIds((current) => {
      const next = new Set(current);
      next.delete(product.id);
      return next;
    });
    setAnnouncement(`${product.name} removed from saved items`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnnouncement(
      searchQuery.trim()
        ? `${visibleProducts.length} matching saved items`
        : `${savedProducts.length} saved items`,
    );
  };

  const restoreFavorites = () => {
    if (profile) return;
    setSavedIds(new Set(favoriteProducts.map((product) => product.id)));
    setActiveFilter("All");
    setSearchQuery("");
    setAnnouncement("Saved items restored");
  };

  return (
    <div className="standard-favorites" dir="ltr" lang="en">
      <header className="standard-favorites__header">
        <div>
          <h1>My Favorites</h1>
          <p aria-live="polite">
            {savedProducts.length} saved {savedProducts.length === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="standard-favorites__sort-wrap">
          <button
            className="standard-favorites__filter-button"
            type="button"
            aria-label="Sort saved items"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen((current) => !current)}
          >
            <IoOptionsOutline aria-hidden="true" />
          </button>
          {sortOpen ? (
            <div className="standard-favorites__sort-menu" role="menu" aria-label="Sort saved items">
              {sortOptions.map((option) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={sort === option}
                  key={option}
                  onClick={() => {
                    setSort(option);
                    setSortOpen(false);
                    setAnnouncement(`Saved items sorted by ${option.toLowerCase()}`);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <form className="standard-favorites__search" role="search" onSubmit={submitSearch}>
        <button type="submit" aria-label="Search saved items">
          <IoSearchOutline aria-hidden="true" />
        </button>
        <label className="sr-only" htmlFor="standard-favorites-search">
          Search saved items
        </label>
        <input
          id="standard-favorites-search"
          ref={searchRef}
          type="search"
          placeholder="Search saved items"
          value={searchQuery}
          autoComplete="off"
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </form>

      <div className="standard-favorites__filters" aria-label="Filter saved items">
        {availableFilters.map((filter) => (
          <button
            type="button"
            key={filter}
            data-active={activeFilter === filter ? "true" : "false"}
            aria-pressed={activeFilter === filter}
            onClick={() => {
              setActiveFilter(filter);
              setAnnouncement(`${filter} filter selected`);
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      {visibleProducts.length ? (
        <section className="standard-favorites__grid" aria-label="Saved products">
          {visibleProducts.map((product) => (
            <article
              className="standard-favorite-card"
              data-product={product.id}
              key={product.id}
            >
              <div className="standard-favorite-card__image-wrap">
                {product.href ? (
                  <StorefrontLink to={product.href} ariaLabel={`Open ${product.name}`}>
                    {product.image && <img src={product.image} alt={product.name} />}
                  </StorefrontLink>
                ) : (
                  <button
                    type="button"
                    aria-label={`Preview ${product.name}`}
                    onClick={() => setAnnouncement(`${product.name} preview is coming next`)}
                  >
                    {product.image && <img src={product.image} alt={product.name} />}
                  </button>
                )}
                <button
                  className="standard-favorite-card__save"
                  type="button"
                  aria-label={`Remove ${product.name} from saved items`}
                  aria-pressed="true"
                  onClick={() => removeFavorite(product)}
                >
                  <IoHeartSharp aria-hidden="true" />
                </button>
              </div>
              <h2>{product.name}</h2>
              <div className="standard-favorite-card__meta">
                {!profile && <span className="standard-favorite-card__rating">
                  <span aria-hidden="true">★</span>
                  <span className="sr-only">Rated </span>
                  {product.rating.toFixed(1)}
                </span>}
                <strong>{product.price == null ? "Price unavailable" : profile ? formatStorefrontMoney(product.price, "lyd", profile.locale) : formatPrice(product.price)}</strong>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="standard-favorites__empty" aria-labelledby="standard-favorites-empty-title">
          <IoHeartSharp aria-hidden="true" />
          <h2 id="standard-favorites-empty-title">No saved items found</h2>
          <p>{profile ? "Save products while browsing, or try another search." : "Try another search or restore the preview collection."}</p>
          {!profile && <button type="button" onClick={restoreFavorites}>Restore saved items</button>}
        </section>
      )}

      <span className="sr-only" aria-live="polite">{announcement}</span>

    </div>
  );
}
