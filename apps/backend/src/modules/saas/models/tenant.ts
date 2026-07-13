/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import StoreProfile from "./store-profile"

const Tenant = model
  .define("tenant", {
    id: model.id({ prefix: "tenant" }).primaryKey(),
    name: model.text().searchable(),
    status: model.enum(["active", "suspended", "archived"]).default("active"),
    stores: model.hasMany(() => StoreProfile, {
      mappedBy: "tenant",
    }),
  })
  .indexes([{ on: ["status"], where: "deleted_at IS NULL" }])

export default Tenant
