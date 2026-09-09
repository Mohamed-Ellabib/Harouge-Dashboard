import type { StorefrontHomeContentDto } from "../../types";

const text = (en: string) => ({ en, ar: en });
// Used for the design preview and older URBX drafts without home content yet.
export const urbxHomeContent: StorefrontHomeContentDto = {
  eyebrow: text("NEW DROP"), heading: text("URBAN VIBES."), statement: text("REAL YOU."),
  cta_label: text("SHOP NOW"), categories_heading: text("Categories"), products_heading: text("Best Sellers"),
  view_all_label: text("View all"), promotion_eyebrow: text("LIMITED DROP"),
  promotion_heading: text("SHADOW HOODIE"), promotion_detail: text("ONLY 200 PIECES"),
  image_url: "/assets/urbx/home-hero-v1.png", promotion_image_url: "/assets/urbx/limited-drop-v1.png",
};
