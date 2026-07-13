import { model } from "@medusajs/framework/utils";

const StoreProvisioning = model
  .define("store_provisioning", {
    id: model.id({ prefix: "stprov" }).primaryKey(),
    idempotency_key: model.text().searchable(),
    request_hash: model.text(),
    tenant_id: model.text().nullable(),
    store_profile_id: model.text().nullable(),
    medusa_store_id: model.text().nullable(),
    sales_channel_id: model.text().nullable(),
    publishable_api_key_id: model.text().nullable(),
    region_id: model.text().nullable(),
    stock_location_id: model.text().nullable(),
    store_domain_id: model.text().nullable(),
    store_brand_id: model.text().nullable(),
    legacy_vendor_id: model.text().nullable(),
    merchant_account_reference: model.text().nullable(),
    merchant_membership_id: model.text().nullable(),
    requested_handle: model.text().searchable(),
    requested_domain: model.text().searchable(),
    requested_owner_email: model.text().searchable(),
    requested_plan_code: model.enum([
      "starter_whatsapp",
      "professional_commerce",
    ]),
    status: model
      .enum([
        "pending",
        "running",
        "completed",
        "failed",
        "requires_attention",
        "cancelled",
      ])
      .default("pending"),
    current_step: model.text().default("validate_input"),
    request_snapshot: model.json(),
    result_snapshot: model.json().nullable(),
    resource_state: model.json().nullable(),
    failure_code: model.text().nullable(),
    failure_message_safe: model.text().nullable(),
    retry_count: model.number().default(0),
    actor_id: model.text(),
    completed_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["idempotency_key"], unique: true, where: "deleted_at IS NULL" },
    { on: ["requested_handle"], unique: true, where: "deleted_at IS NULL" },
    { on: ["requested_domain"], unique: true, where: "deleted_at IS NULL" },
    { on: ["status", "current_step"], where: "deleted_at IS NULL" },
    {
      on: ["tenant_id"],
      where: "deleted_at IS NULL AND tenant_id IS NOT NULL",
    },
    {
      on: ["store_profile_id"],
      where: "deleted_at IS NULL AND store_profile_id IS NOT NULL",
    },
  ]);

export default StoreProvisioning;
