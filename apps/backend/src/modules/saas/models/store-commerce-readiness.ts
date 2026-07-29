/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import StoreProfile from "./store-profile"

const StoreCommerceReadiness = model
  .define("store_commerce_readiness", {
    id: model.id({ prefix: "stready" }).primaryKey(),
    store_profile: model.belongsTo(() => StoreProfile, {
      mappedBy: "commerce_readiness",
    }),
    capability: model.enum(["online_checkout"]).default("online_checkout"),
    plan_code: model.enum(["starter_whatsapp", "professional_commerce"]),
    status: model
      .enum([
        "not_required",
        "pending",
        "configuring",
        "ready",
        "failed",
        "requires_attention",
        "disabled",
      ])
      .default("pending"),
    medusa_store_id: model.text().nullable(),
    region_id: model.text().nullable(),
    stock_location_id: model.text().nullable(),
    fulfillment_provider_id: model.text().nullable(),
    shipping_profile_id: model.text().nullable(),
    fulfillment_set_id: model.text().nullable(),
    service_zone_id: model.text().nullable(),
    shipping_option_ids: model.json().nullable(),
    last_setup_id: model.text().nullable(),
    failure_code: model.text().nullable(),
    failure_message_safe: model.text().nullable(),
    validated_at: model.dateTime().nullable(),
    revision: model.number().default(1),
  })
  .indexes([
    {
      on: ["store_profile_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["status"], where: "deleted_at IS NULL" },
    {
      on: ["medusa_store_id"],
      where: "deleted_at IS NULL AND medusa_store_id IS NOT NULL",
    },
  ])

export default StoreCommerceReadiness
