import { model } from "@medusajs/framework/utils";

const StoreProvisioningEvent = model
  .define("store_provisioning_event", {
    id: model.id({ prefix: "stpevt" }).primaryKey(),
    provisioning_id: model.text().index(),
    event_type: model.enum([
      "started",
      "step_completed",
      "resource_reused",
      "resource_retained",
      "failed",
      "requires_attention",
      "completed",
      "cancelled",
    ]),
    step: model.text(),
    actor_id: model.text(),
    safe_details: model.json().nullable(),
  })
  .indexes([
    { on: ["provisioning_id", "created_at"], where: "deleted_at IS NULL" },
    { on: ["event_type"], where: "deleted_at IS NULL" },
  ]);

export default StoreProvisioningEvent;
