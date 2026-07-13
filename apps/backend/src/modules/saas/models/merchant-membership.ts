/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import StoreProfile from "./store-profile"

const MerchantMembership = model
  .define("merchant_membership", {
    id: model.id({ prefix: "mship" }).primaryKey(),
    store_profile: model.belongsTo(() => StoreProfile, {
      mappedBy: "memberships",
    }),
    merchant_account_reference: model.text().searchable(),
    role: model.enum(["owner", "manager"]).default("owner"),
    status: model.enum(["active", "disabled"]).default("active"),
  })
  .indexes([
    {
      on: ["store_profile_id", "merchant_account_reference"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["store_profile_id"], where: "deleted_at IS NULL" },
    { on: ["merchant_account_reference"], where: "deleted_at IS NULL" },
    { on: ["status"], where: "deleted_at IS NULL" },
  ])

export default MerchantMembership
