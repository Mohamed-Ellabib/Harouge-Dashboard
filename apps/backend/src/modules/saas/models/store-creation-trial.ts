import { model } from "@medusajs/framework/utils"

export default model.define("store_creation_trial", {
  id: model.id({ prefix: "sttrial" }).primaryKey(),
  draft_id: model.text(),
  status: model.enum(["cart", "ordered"]).default("cart"),
  values: model.json(),
}).indexes([{ on: ["draft_id"] }])
