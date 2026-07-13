import { defineLink } from "@medusajs/framework/utils"
import StoreModule from "@medusajs/medusa/store"

import SaasModule from "../modules/saas"

export default defineLink(
  SaasModule.linkable.storeProfile,
  StoreModule.linkable.store,
  {
    database: { table: "store_profile_store" },
  }
)
