import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  getMerchantStoreContext,
  requireMerchantPermission,
} from "../../_utils/merchant-store-context"
import {
  domainsForVendor,
  getMarketplaceService,
  serializeVendorProfile,
  stringOrNull,
} from "../../_utils/vendors"

type VendorProfileUpdateBody = {
  name?: unknown
  contact_email?: unknown
  logo_url?: unknown
  primary_color?: unknown
  [key: string]: unknown
}

const PLATFORM_CONTROLLED_FIELDS = new Set([
  "id",
  "vendor_id",
  "store_id",
  "merchant_id",
  "status",
  "handle",
  "domains",
  "domain",
  "metadata",
  "sales_channel_id",
  "sales_channel_ids",
  "sales_channels",
  "publishable_api_key_id",
  "plan",
  "account_status",
  "provisioning_state",
  "permissions",
])

const responseBody = async (req: MedusaRequest) => {
  const context = await getMerchantStoreContext(req)
  const marketplace = getMarketplaceService(req)
  const vendor = await marketplace.retrieveVendor(context.vendorId)
  const domains = await marketplace.listVendorDomains()

  return {
    vendor: serializeVendorProfile(
      vendor,
      domainsForVendor(domains, context.vendorId)
    ),
    member: {
      id: context.member.id,
      email: context.member.email,
      role: context.role,
      status: context.accountStatus,
    },
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await getMerchantStoreContext(req)
  requireMerchantPermission(context, "store.read")
  return res.json(await responseBody(req))
}

export async function PATCH(
  req: MedusaRequest<VendorProfileUpdateBody>,
  res: MedusaResponse
) {
  const context = await getMerchantStoreContext(req)
  requireMerchantPermission(context, "store.manage")
  const body = req.body ?? {}

  if (Object.keys(body).some((key) => PLATFORM_CONTROLLED_FIELDS.has(key))) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "One or more fields are controlled by the platform."
    )
  }

  const update: Record<string, unknown> = { id: context.vendorId }

  if ("name" in body) {
    const name = stringOrNull(body.name)
    if (!name) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Store name is required.")
    }
    update.name = name
  }
  if ("contact_email" in body) {
    update.contact_email = stringOrNull(body.contact_email)
  }
  if ("logo_url" in body) {
    update.logo_url = stringOrNull(body.logo_url)
  }
  if ("primary_color" in body) {
    const color = stringOrNull(body.primary_color)
    if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Primary color must be a six-digit hex color."
      )
    }
    update.primary_color = color
  }

  if (Object.keys(update).length === 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No supported store fields were provided."
    )
  }

  await getMarketplaceService(req).updateVendors(update as any)
  return res.json(await responseBody(req))
}
