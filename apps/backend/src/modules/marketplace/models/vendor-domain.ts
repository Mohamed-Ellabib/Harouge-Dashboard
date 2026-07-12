import { model } from "@medusajs/framework/utils"

const VendorDomain = model.define("vendor_domain", {
  id: model.id({ prefix: "vdom" }).primaryKey(),
  domain: model.text().unique().searchable(),
  is_primary: model.boolean().default(false),
  vendor_id: model.text().index(),
})

export default VendorDomain
