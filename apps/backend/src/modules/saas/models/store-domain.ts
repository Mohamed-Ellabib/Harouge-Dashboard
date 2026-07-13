/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import StoreProfile from "./store-profile"

const StoreDomain = model
  .define("store_domain", {
    id: model.id({ prefix: "stdom" }).primaryKey(),
    store_profile: model.belongsTo(() => StoreProfile, {
      mappedBy: "domains",
    }),
    normalized_hostname: model.text().searchable(),
    original_hostname: model.text().nullable(),
    type: model.enum(["temporary", "custom"]).default("temporary"),
    verification_status: model
      .enum(["pending", "verified", "failed"])
      .default("pending"),
    ssl_status: model.enum(["pending", "active", "failed"]).default("pending"),
    is_primary: model.boolean().default(false),
  })
  .indexes([
    {
      on: ["normalized_hostname"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["store_profile_id"], where: "deleted_at IS NULL" },
    {
      name: "IDX_store_domain_one_primary",
      on: ["store_profile_id"],
      unique: true,
      where: "deleted_at IS NULL AND is_primary = true",
    },
    { on: ["verification_status"], where: "deleted_at IS NULL" },
  ])

export default StoreDomain
