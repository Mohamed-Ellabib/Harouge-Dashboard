import { model } from "@medusajs/framework/utils";

const StoreProvisioningLease = model
  .define("store_provisioning_lease", {
    id: model.id({ prefix: "stplease" }).primaryKey(),
    idempotency_key: model.text().searchable(),
    provisioning_id: model.text().index(),
    lease_token: model.text(),
    expires_at: model.dateTime(),
  })
  .indexes([
    { on: ["idempotency_key"], unique: true, where: "deleted_at IS NULL" },
    { on: ["expires_at"], where: "deleted_at IS NULL" },
  ]);

export default StoreProvisioningLease;
