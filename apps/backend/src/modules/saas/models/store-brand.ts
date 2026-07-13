/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import StoreProfile from "./store-profile"

const StoreBrand = model
  .define("store_brand", {
    id: model.id({ prefix: "stbrand" }).primaryKey(),
    store_profile: model.belongsTo(() => StoreProfile, { mappedBy: "brand" }),
    logo_url: model.text().nullable(),
    favicon_url: model.text().nullable(),
    primary_color: model.text().nullable(),
    secondary_color: model.text().nullable(),
    typography_key: model.text().nullable(),
    configuration: model.json().nullable(),
  })
  .indexes([
    {
      on: ["store_profile_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default StoreBrand
