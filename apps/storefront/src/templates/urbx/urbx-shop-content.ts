import type { StorefrontShopContentDto } from "../../types";

const text = (en: string) => ({ en, ar: en });
export const urbxShopContent: StorefrontShopContentDto = {
  heading: text("SHOP"), statement: text("THE DROP"),
  search_placeholder: text("Search streetwear…"),
};
