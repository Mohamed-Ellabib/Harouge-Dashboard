import "@fontsource-variable/cairo";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-arabic";

import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import { DropsCartPage } from "./templates/drops/DropsCartPage";
import { DropsCategoriesPage } from "./templates/drops/DropsCategoriesPage";
import { DropsHomePage } from "./templates/drops/DropsHomePage";
import { DropsOrderConfirmedPage } from "./templates/drops/DropsOrderConfirmedPage";
import { DropsProductDetailsPage } from "./templates/drops/DropsProductDetailsPage";
import { GlowBeautyCatalogPage } from "./templates/glow-beauty/GlowBeautyCatalogPage";
import { GlowBeautyCartPage } from "./templates/glow-beauty/GlowBeautyCartPage";
import { GlowBeautyCategoriesPage } from "./templates/glow-beauty/GlowBeautyCategoriesPage";
import { GlowBeautyCheckoutPage } from "./templates/glow-beauty/GlowBeautyCheckoutPage";
import { GlowBeautyHomePage } from "./templates/glow-beauty/GlowBeautyHomePage";
import { GlowBeautyDesignEditor } from "./templates/glow-beauty/GlowBeautyDesignEditor";
import { GlowBeautyOrderPlacedPage } from "./templates/glow-beauty/GlowBeautyOrderPlacedPage";
import { GlowBeautyOrdersPage } from "./templates/glow-beauty/GlowBeautyOrdersPage";
import { GlowBeautyProductDetailsPage } from "./templates/glow-beauty/GlowBeautyProductDetailsPage";
import { GlowBeautyWelcomePage } from "./templates/glow-beauty/GlowBeautyWelcomePage";
import { GlowBeautyBottomNav } from "./templates/glow-beauty/GlowBeautyChrome";
import { GlowBeautyWishlistPage } from "./templates/glow-beauty/GlowBeautyWishlistPage";
import "./styles.css";
import "./templates/luxe-commerce.css";
import "./templates/luxe-commerce-full.css";

document.documentElement.lang = "ar";
document.documentElement.dir = "rtl";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Storefront root element was not found.");
}

const glowBeautyDesignPreview =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get("preview") === "1" &&
  new URLSearchParams(window.location.search).get("template") === "glow-beauty";
const glowBeautyCatalogPreview = glowBeautyDesignPreview && window.location.pathname === "/products";
const glowBeautyCategoriesPreview = glowBeautyDesignPreview && window.location.pathname === "/categories";
const glowBeautyCheckoutPreview = glowBeautyDesignPreview && window.location.pathname === "/checkout";
const glowBeautyOrderPlacedPreview = glowBeautyDesignPreview && window.location.pathname === "/order-confirmation";
const glowBeautyOrdersPreview = glowBeautyDesignPreview && window.location.pathname === "/orders";
const glowBeautyProductPreview = glowBeautyDesignPreview && window.location.pathname === "/products/radiance-serum";
const glowBeautyCartPreview = glowBeautyDesignPreview && window.location.pathname === "/cart";
const glowBeautyWishlistPreview = glowBeautyDesignPreview && window.location.pathname === "/favorites";
const glowBeautyWelcomePreview = glowBeautyDesignPreview && window.location.pathname === "/welcome";
const dropsDesignPreview =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get("preview") === "1" &&
  new URLSearchParams(window.location.search).get("template") === "drops";
const dropsOrderConfirmedPreview = dropsDesignPreview && window.location.pathname === "/order-confirmation";
const dropsProductPreview = dropsDesignPreview && window.location.pathname === "/products/jordan-1-low-grey-toe";
const dropsCategoriesPreview = dropsDesignPreview && window.location.pathname === "/categories";
const dropsCartPreview = dropsDesignPreview && window.location.pathname === "/cart";

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <GlowBeautyDesignEditor>
    {dropsDesignPreview
      ? (dropsCartPreview
        ? <DropsCartPage />
        : dropsCategoriesPreview
        ? <DropsCategoriesPage />
        : dropsProductPreview
        ? <DropsProductDetailsPage />
        : dropsOrderConfirmedPreview
          ? <DropsOrderConfirmedPage />
          : <DropsHomePage />)
      : glowBeautyDesignPreview
      ? <div className="glow-beauty-preview-shell">{(glowBeautyWelcomePreview
        ? <GlowBeautyWelcomePage />
        : glowBeautyOrdersPreview
        ? <GlowBeautyOrdersPage />
        : glowBeautyWishlistPreview
        ? <GlowBeautyWishlistPage />
        : glowBeautyCartPreview
        ? <GlowBeautyCartPage />
        : glowBeautyOrderPlacedPreview
          ? <GlowBeautyOrderPlacedPage />
        : glowBeautyCheckoutPreview
          ? <GlowBeautyCheckoutPage />
        : glowBeautyCategoriesPreview
          ? <GlowBeautyCategoriesPage />
        : glowBeautyProductPreview
        ? <GlowBeautyProductDetailsPage />
        : glowBeautyCatalogPreview
          ? <GlowBeautyCatalogPage />
          : <GlowBeautyHomePage />)}<GlowBeautyBottomNav pathname={window.location.pathname} /></div>
      : <App />}
    </GlowBeautyDesignEditor>
  </React.StrictMode>,
);
