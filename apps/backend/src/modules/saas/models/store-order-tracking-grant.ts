import { model } from "@medusajs/framework/utils"
export default model.define("store_order_tracking_grant", {
  id: model.id({ prefix: "stgrant" }).primaryKey(), token_hash: model.text(), order_id: model.text(), store_id: model.text(),
  snapshot: model.json(), expires_at: model.dateTime(),
}).indexes([{ on: ["token_hash"], unique: true, where: "deleted_at IS NULL" }, { on: ["order_id"] }, { on: ["store_id"] }])
