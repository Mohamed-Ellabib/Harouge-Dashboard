import { defineLink } from "@medusajs/framework/utils";
import CartModule from "@medusajs/medusa/cart";
import StoreModule from "@medusajs/medusa/store";

export default defineLink(
  StoreModule.linkable.store,
  {
    linkable: CartModule.linkable.cart,
    isList: true,
  },
  {
    database: {
      table: "store_cart",
      extraColumns: {
        ownership_key: {
          type: "string",
          nullable: false,
          options: { unique: true },
        },
      },
    },
  },
);
