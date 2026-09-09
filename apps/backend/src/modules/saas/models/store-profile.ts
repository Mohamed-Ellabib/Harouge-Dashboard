/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import MerchantMembership from "./merchant-membership"
import StoreBrand from "./store-brand"
import StoreCommerceReadiness from "./store-commerce-readiness"
import StoreDomain from "./store-domain"
import StorefrontDocument from "./storefront-document"
import Tenant from "./tenant"

const StoreProfile = model
  .define("store_profile", {
    id: model.id({ prefix: "stprof" }).primaryKey(),
    tenant: model.belongsTo(() => Tenant, { mappedBy: "stores" }),
    legacy_vendor_id: model.text().nullable(),
    handle: model.text().searchable(),
    status: model
      .enum(["draft", "active", "suspended", "archived"])
      .default("draft"),
    locale: model.text().default("ar-LY"),
    timezone: model.text().default("Africa/Tripoli"),
    plan_code: model
      .enum(["starter_whatsapp", "professional_commerce"])
      .default("starter_whatsapp"),
    public_contact_email: model.text().nullable(),
    public_phone: model.text().nullable(),
    whatsapp_number: model.text().nullable(),
    configuration_revision: model.number().default(1),
    configuration_updated_by: model.text().nullable(),
    configuration_updated_at: model.dateTime().nullable(),
    domains: model.hasMany(() => StoreDomain, { mappedBy: "store_profile" }),
    brand: model.hasOne(() => StoreBrand, { mappedBy: "store_profile" }),
    storefront_document: model.hasOne(() => StorefrontDocument, {
      mappedBy: "store_profile",
    }),
    commerce_readiness: model.hasOne(() => StoreCommerceReadiness, {
      mappedBy: "store_profile",
    }),
    memberships: model.hasMany(() => MerchantMembership, {
      mappedBy: "store_profile",
    }),
  })
  .indexes([
    { on: ["tenant_id"], where: "deleted_at IS NULL" },
    { on: ["handle"], unique: true, where: "deleted_at IS NULL" },
    {
      on: ["legacy_vendor_id"],
      unique: true,
      where: "deleted_at IS NULL AND legacy_vendor_id IS NOT NULL",
    },
    { on: ["status"], where: "deleted_at IS NULL" },
  ])

export default StoreProfile
