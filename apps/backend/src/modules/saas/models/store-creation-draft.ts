import { model } from "@medusajs/framework/utils"

export default model.define("store_creation_draft", {
  id: model.id({ prefix: "stdraft" }).primaryKey(),
  request_key: model.text(),
  revision: model.number().default(1),
  status: model.enum(["draft", "confirming", "confirmed"]).default("draft"),
  values: model.json(),
  checkpoints: model.json().default({}),
  store_profile_id: model.text().nullable(),
  created_by: model.text(),
}).indexes([{ on: ["request_key"], unique: true, where: "deleted_at IS NULL" }])
