import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { updateLegacyCompatibleStore } from "../../_utils/legacy-vendor-compatibility";
import {
  getMerchantStoreContext,
  requireMerchantPermission,
} from "../../_utils/merchant-store-context";
import { resolveStoreCommerceConfiguration } from "../../_utils/checkout-store-policy";
import {
  domainsForVendor,
  getMarketplaceService,
  serializeVendorProfile,
  stringOrNull,
} from "../../_utils/vendors";

type VendorProfileUpdateBody = {
  name?: unknown;
  contact_email?: unknown;
  logo_url?: unknown;
  primary_color?: unknown;
  [key: string]: unknown;
};

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
]);

const responseBody = async (req: MedusaRequest) => {
  const context = await getMerchantStoreContext(req);
  const marketplace = getMarketplaceService(req);
  const [vendor, domains, commerce] = await Promise.all([
    marketplace.retrieveVendor(context.vendorId),
    marketplace.listVendorDomains(),
    resolveStoreCommerceConfiguration(req, context.medusaStoreId),
  ]);

  return {
    vendor: serializeVendorProfile(
      vendor,
      domainsForVendor(domains, context.vendorId),
    ),
    member: {
      id: context.member.id,
      email: context.member.email,
      role: context.role,
      status: context.accountStatus,
    },
    commerce: {
      currency_code: commerce.currencyCode,
    },
  };
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await getMerchantStoreContext(req);
  requireMerchantPermission(context, "store.read");
  return res.json(await responseBody(req));
}

export async function PATCH(
  req: MedusaRequest<VendorProfileUpdateBody>,
  res: MedusaResponse,
) {
  const context = await getMerchantStoreContext(req);
  requireMerchantPermission(context, "store.manage");
  const body = req.body ?? {};

  if (Object.keys(body).some((key) => PLATFORM_CONTROLLED_FIELDS.has(key))) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "One or more fields are controlled by the platform.",
    );
  }

  const update: Record<string, unknown> = { id: context.vendorId };

  if ("name" in body) {
    const name = stringOrNull(body.name);
    if (!name) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Store name is required.",
      );
    }
    update.name = name;
  }
  if ("contact_email" in body) {
    update.contact_email = stringOrNull(body.contact_email);
  }
  if ("logo_url" in body) {
    update.logo_url = stringOrNull(body.logo_url);
  }
  if ("primary_color" in body) {
    const color = stringOrNull(body.primary_color);
    if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Primary color must be a six-digit hex color.",
      );
    }
    update.primary_color = color;
  }

  if (Object.keys(update).length === 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No supported store fields were provided.",
    );
  }

  await updateLegacyCompatibleStore(
    req,
    {
      vendorId: context.vendorId,
      storeProfileId: context.storeProfileId,
      medusaStoreId: context.medusaStoreId,
    },
    {
      ...("name" in update ? { name: update.name as string } : {}),
      ...("contact_email" in update
        ? { public_contact_email: update.contact_email as string | null }
        : {}),
      ...("logo_url" in update
        ? { logo_url: update.logo_url as string | null }
        : {}),
      ...("primary_color" in update
        ? { primary_color: update.primary_color as string | null }
        : {}),
    },
    `merchant:${context.member.id}`,
  );
  return res.json(await responseBody(req));
}
