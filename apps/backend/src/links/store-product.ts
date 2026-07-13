import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import StoreModule from "@medusajs/medusa/store"

export default defineLink(
  StoreModule.linkable.store,
  {
    linkable: ProductModule.linkable.product,
    isList: true,
  },
  {
    database: { table: "store_product" },
  }
)
