import { useEffect } from "react";

import { useFavorites } from "../commerce/FavoritesContext";
import { HeartIcon } from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { StorefrontLink } from "../lib/navigation";
import { storefrontUiText } from "../lib/localization";
import type { StorefrontProfileDto } from "../types";

export const FavoritesPage = ({ profile }: { profile: StorefrontProfileDto }) => {
  const { favorites } = useFavorites();
  const text = (ar: string, en: string) => storefrontUiText(profile.locale, { ar, en });

  useEffect(() => {
    document.title = `${text("المفضلة", "Favorites")} | ${profile.name}`;
  }, [profile.locale, profile.name]);

  return (
    <section className="luxe-favorites-page" aria-labelledby="favorites-title">
      <div className="shell luxe-page-topbar">
        <span aria-hidden="true"><HeartIcon /></span>
        <div>
          <h1 id="favorites-title">{text("المفضلة", "Favorites")}</h1>
          <p>{text("احتفظ بالقطع التي أحببتها للعودة إليها بسهولة.", "Keep the pieces you love close at hand.")}</p>
        </div>
        <strong>{favorites.length}</strong>
      </div>
      <div className="shell luxe-favorites-content">
        {favorites.length ? (
          <div className="product-grid">
            {favorites.map((product) => (
              <ProductCard key={product.handle} product={product} locale={profile.locale} />
            ))}
          </div>
        ) : (
          <div className="luxe-favorites-empty">
            <HeartIcon />
            <h2>{text("لا توجد منتجات في المفضلة", "Your favorites are empty")}</h2>
            <p>{text("اضغط على رمز القلب في أي منتج ليظهر هنا.", "Tap the heart on any product to save it here.")}</p>
            <StorefrontLink className="button button--primary" to="/products">
              {text("اكتشف المنتجات", "Discover products")}
            </StorefrontLink>
          </div>
        )}
      </div>
    </section>
  );
};
