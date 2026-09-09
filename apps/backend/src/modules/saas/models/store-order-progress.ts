import { model } from "@medusajs/framework/utils"
export default model.define("store_order_progress", {
  id: model.id({ prefix: "stprogress" }).primaryKey(), order_id: model.text(), store_id: model.text(),
  status: model.enum(["confirmed", "processing", "shipped", "delivered"]).default("confirmed"),
  revision: model.number().default(1), events: model.json(),
}).indexes([{ on: ["order_id"], unique: true, where: "deleted_at IS NULL" }, { on: ["store_id"] }])
