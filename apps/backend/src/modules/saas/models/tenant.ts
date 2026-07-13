/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import StoreProfile from "./store-profile"

const Tenant = model
  .define("tenant", {
    id: model.id({ prefix: "tenant" }).primaryKey(),
    key: model.text().searchable().nullable(),
    name: model.text().searchable(),
    status: model.enum(["active", "suspended", "archived"]).default("active"),
    stores: model.hasMany(() => StoreProfile, {
      mappedBy: "tenant",
    }),
  })
  .indexes([
    {
      on: ["key"],
      unique: true,
      where: "deleted_at IS NULL AND key IS NOT NULL",
    },
    { on: ["status"], where: "deleted_at IS NULL" },
  ])

export default Tenant
