import { model } from "@medusajs/framework/utils";

const CheckoutOwnershipRepair = model
  .define("checkout_ownership_repair", {
    id: model.id({ prefix: "corepair" }).primaryKey(),
    kind: model.enum(["cart", "order"]),
    cart_id: model.text().nullable(),
    order_id: model.text().nullable(),
    store_id: model.text().nullable(),
    status: model.enum(["pending", "resolved"]).default("pending"),
    reason: model.text(),
    details: model.json().nullable(),
  })
  .indexes([
    { on: ["kind", "status"], where: "deleted_at IS NULL" },
    { on: ["cart_id"], where: "deleted_at IS NULL AND cart_id IS NOT NULL" },
    { on: ["order_id"], where: "deleted_at IS NULL AND order_id IS NOT NULL" },
    { on: ["store_id"], where: "deleted_at IS NULL AND store_id IS NOT NULL" },
  ]);

export default CheckoutOwnershipRepair;
