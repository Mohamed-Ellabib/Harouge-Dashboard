import { model } from "@medusajs/framework/utils"

const StoreCommerceSetupLease = model
  .define("store_commerce_setup_lease", {
    id: model.id({ prefix: "stcslease" }).primaryKey(),
    lease_key: model.text().searchable(),
    setup_id: model.text().index(),
    lease_token: model.text(),
    expires_at: model.dateTime(),
  })
  .indexes([
    { on: ["lease_key"], unique: true, where: "deleted_at IS NULL" },
    { on: ["expires_at"], where: "deleted_at IS NULL" },
  ])

export default StoreCommerceSetupLease
