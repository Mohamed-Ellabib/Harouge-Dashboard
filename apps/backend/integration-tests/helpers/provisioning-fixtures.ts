import type { PlanCode } from "../../src/workflows/provisioning-contract";

type ProvisioningRequestOptions = {
  suffix: string;
  planCode?: PlanCode;
  tenantKey?: string;
  tenantName?: string;
  reuseTenant?: boolean;
  ownerEmail?: string;
  reuseOwner?: boolean;
  customDomain?: string;
};

export const provisioningPassword = "Synthetic-Phase-2C-Temporary-Passphrase";

export const provisioningRequest = ({
  suffix,
  planCode = "starter_whatsapp",
  tenantKey = "tenant-" + suffix,
  tenantName = "Tenant " + suffix,
  reuseTenant = false,
  ownerEmail = "owner-" + suffix + "@example.test",
  reuseOwner = false,
  customDomain,
}: ProvisioningRequestOptions) => ({
  tenant: {
    name: tenantName,
    key: tenantKey,
    reuse_existing: reuseTenant,
  },
  store: {
    name: "Store " + suffix,
    handle: "store-" + suffix,
    plan_code: planCode,
    locale: "ar-LY",
    timezone: "Africa/Tripoli",
    currency_code: "lyd",
    status_after_provisioning: "active",
  },
  owner: {
    email: ownerEmail,
    display_name: "Owner " + suffix,
    ...(reuseOwner
      ? { reuse_existing_account: true }
      : {
          reuse_existing_account: false,
          initial_password: provisioningPassword,
        }),
  },
  brand: {
    logo_url: "https://cdn.example.test/" + suffix + ".png",
    favicon_url: "https://cdn.example.test/" + suffix + ".ico",
    primary_color: "#1257A6",
    secondary_color: "#F2B134",
    typography_key: "cairo",
  },
  commerce: {
    region_name: "Region " + suffix,
    countries: ["ly"],
    stock_location_name: "Stock " + suffix,
    sales_channel_name: "Web " + suffix,
  },
  contact: {
    public_email: "public-" + suffix + "@example.test",
    public_phone: "+218910000000",
    whatsapp_number: "+218920000000",
  },
  domain: customDomain ? { custom_hostname: customDomain } : {},
});
