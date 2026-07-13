/* eslint-disable @medusajs/use-medusa-error-not-generic-error */
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { MARKETPLACE_MODULE } from "../modules/marketplace"
import type MarketplaceModuleService from "../modules/marketplace/service"

export default async function diagnoseProductSalesChannels({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (process.argv.includes("--apply")) {
    throw new Error(
      "Phase 0.5 only permits dry-run diagnostics. No relationships were changed."
    )
  }

  const marketplace = container.resolve(
    MARKETPLACE_MODULE
  ) as MarketplaceModuleService
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const linkModule = link.getLinkModule(
    MARKETPLACE_MODULE,
    "vendor_id",
    Modules.PRODUCT,
    "product_id"
  )

  if (!linkModule) {
    throw new Error("The vendor-product link module is unavailable.")
  }

  const vendors = await marketplace.listVendors()
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]))
  const productLinks = await linkModule.list({})
  const productIds = [...new Set(productLinks.map((record) => record.product_id))]
  const products: Array<{
    id: string
    sales_channels?: Array<{ id: string }>
  }> = productIds.length
    ? (
        await query.graph({
          entity: "product",
          fields: ["id", "sales_channels.id"],
          filters: { id: productIds },
          pagination: { skip: 0, take: productIds.length },
        })
      ).data as Array<{
        id: string
        sales_channels?: Array<{ id: string }>
      }>
    : []
  const productById = new Map(products.map((product) => [product.id, product]))
  const unexpected = productLinks.flatMap((record) => {
    const vendor = vendorById.get(record.vendor_id)
    const product = productById.get(record.product_id)
    const metadata =
      vendor?.metadata && typeof vendor.metadata === "object"
        ? vendor.metadata
        : {}
    const expectedChannelId = (metadata as Record<string, unknown>)
      .sales_channel_id
    const actualChannelIds = (product?.sales_channels ?? []).map(
      (channel) => channel.id
    )

    if (
      typeof expectedChannelId !== "string" ||
      (actualChannelIds.length === 1 &&
        actualChannelIds[0] === expectedChannelId)
    ) {
      return []
    }

    return [
      {
        vendor_id: record.vendor_id,
        product_id: record.product_id,
        expected_sales_channel_id: expectedChannelId ?? null,
        actual_sales_channel_ids: actualChannelIds,
      },
    ]
  })

  logger.info(
    JSON.stringify({
      mode: "dry-run",
      checked_products: productIds.length,
      unexpected_relationships: unexpected.length,
      findings: unexpected,
    })
  )
}
