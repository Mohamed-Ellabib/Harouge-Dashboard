import { model } from "@medusajs/framework/utils"

const VendorMember = model.define("vendor_member", {
  id: model.id({ prefix: "vmem" }).primaryKey(),
  vendor_id: model.text().index(),
  user_id: model.text().index().nullable(),
  email: model.text().searchable(),
  role: model.enum(["owner", "manager"]).default("owner"),
  status: model.enum(["active", "disabled"]).default("active"),
  metadata: model.json().nullable(),
})

export default VendorMember
