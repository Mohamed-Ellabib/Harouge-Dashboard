import { defineLink } from "@medusajs/framework/utils";
import OrderModule from "@medusajs/medusa/order";
import StoreModule from "@medusajs/medusa/store";

export default defineLink(
  StoreModule.linkable.store,
  {
    linkable: OrderModule.linkable.order,
    isList: true,
  },
  {
    database: {
      table: "store_order",
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
