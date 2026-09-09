/* eslint-disable @medusajs/link-no-cross-module-relationship -- plugin misresolves in-module Windows paths */
import { model } from "@medusajs/framework/utils"

import StorefrontDocument from "./storefront-document"

const StorefrontDocumentRevision = model
  .define("storefront_document_revision", {
    id: model.id({ prefix: "stdrev" }).primaryKey(),
    storefront_document: model.belongsTo(() => StorefrontDocument, {
      mappedBy: "revisions",
    }),
    store_profile_id: model.text().index(),
    revision: model.number(),
    schema_version: model.number().default(1),
    template_key: model.enum([
      "luxe-commerce",
      "luxe-commerce-full",
      "modern-market",
      "home-living",
      "standard",
      "glow-beauty",
      "drops",
      "urbx",
      "template-6",
    ]),
    document: model.json(),
    created_by: model.text().nullable(),
  })
  .indexes([
    {
      on: ["storefront_document_id", "revision"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      on: ["store_profile_id", "revision"],
      where: "deleted_at IS NULL",
    },
    { on: ["template_key"], where: "deleted_at IS NULL" },
  ])

export default StorefrontDocumentRevision
