/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import StoreManualBankTransferConfiguration from "./store-manual-bank-transfer-configuration"
import StoreProfile from "./store-profile"
import StorefrontDocumentRevision from "./storefront-document-revision"

const StorefrontDocument = model
  .define("storefront_document", {
    id: model.id({ prefix: "stdoc" }).primaryKey(),
    store_profile: model.belongsTo(() => StoreProfile, {
      mappedBy: "storefront_document",
    }),
    latest_revision: model.number().default(1),
    draft_revision: model.number().default(1),
    published_revision: model.number().nullable(),
    draft_updated_by: model.text().nullable(),
    draft_updated_at: model.dateTime().nullable(),
    published_by: model.text().nullable(),
    published_at: model.dateTime().nullable(),
    revisions: model.hasMany(() => StorefrontDocumentRevision, {
      mappedBy: "storefront_document",
    }),
    manual_bank_transfer_configuration: model.hasOne(
      () => StoreManualBankTransferConfiguration,
      { mappedBy: "storefront_document" },
    ),
  })
  .indexes([
    {
      on: ["store_profile_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["published_revision"], where: "deleted_at IS NULL" },
  ])

export default StorefrontDocument
