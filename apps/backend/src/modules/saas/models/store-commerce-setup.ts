import { model } from "@medusajs/framework/utils"

const StoreCommerceSetup = model
  .define("store_commerce_setup", {
    id: model.id({ prefix: "stcsetup" }).primaryKey(),
    idempotency_key: model.text().searchable(),
    request_hash: model.text(),
    store_profile_id: model.text().searchable(),
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
    current_step: model.text().default("validate_store"),
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
    {
      on: ["store_profile_id", "status"],
      where: "deleted_at IS NULL",
    },
    {
      on: ["store_profile_id"],
      unique: true,
      where:
        "deleted_at IS NULL AND status IN ('pending', 'running', 'failed', 'requires_attention')",
    },
  ])

export default StoreCommerceSetup
