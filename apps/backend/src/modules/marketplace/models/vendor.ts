import { model } from "@medusajs/framework/utils"

const Vendor = model.define("vendor", {
  id: model.id({ prefix: "vend" }).primaryKey(),
  name: model.text().searchable(),
  handle: model.text().unique().searchable(),
  status: model.enum(["draft", "active", "suspended"]).default("draft"),
  contact_email: model.text().nullable(),
  logo_url: model.text().nullable(),
  primary_color: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Vendor
