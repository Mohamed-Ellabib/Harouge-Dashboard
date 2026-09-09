/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import StorefrontDocument from "./storefront-document"

const StoreManualBankTransferConfiguration = model
  .define("store_manual_bank_transfer_configuration", {
    id: model.id({ prefix: "stbank" }).primaryKey(),
    storefront_document: model.belongsTo(() => StorefrontDocument, {
      mappedBy: "manual_bank_transfer_configuration",
    }),
    store_profile_id: model.text(),
    bank_name: model.text().nullable(),
    account_holder_name: model.text().nullable(),
    account_reference: model.text().nullable(),
    instructions: model.json(),
    revision: model.number().default(1),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      on: ["storefront_document_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      on: ["store_profile_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default StoreManualBankTransferConfiguration
