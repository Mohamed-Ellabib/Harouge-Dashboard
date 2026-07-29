export type PlatformVendorStatus = "draft" | "active" | "suspended"

export type PlatformDomain = {
  id: string
  domain: string
  is_primary: boolean
}

export type PlatformMember = {
  id: string
  user_id?: string | null
  email: string
  role: string
  status: string
}

export type ProvisioningStatus = {
  id: string
  status: string
  current_step?: string | null
  requested_handle?: string | null
  requested_domain?: string | null
  requested_owner_email?: string | null
  requested_plan_code?: "starter_whatsapp" | "professional_commerce" | null
  retry_count?: number
  failure_code?: string | null
  failure_message?: string | null
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
}

export type PlatformVendor = {
  id: string
  name: string
  handle: string
  status: PlatformVendorStatus
  contact_email?: string | null
  logo_url?: string | null
  primary_color?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
  product_count?: number
  domains: PlatformDomain[]
  members: PlatformMember[]
  provisioning?: ProvisioningStatus | null
}

export type ProvisionStoreRequest = {
  tenant: {
    name: string
    key: string
    reuse_existing: boolean
  }
  store: {
    name: string
    handle: string
    plan_code: "starter_whatsapp" | "professional_commerce"
    locale: string
    timezone: string
    currency_code: string
    status_after_provisioning: "active"
  }
  owner: {
    email: string
    display_name?: string
    initial_password?: string
    reuse_existing_account: boolean
  }
  brand: {
    primary_color?: string
    secondary_color?: string
  }
  commerce: {
    region_name: string
    countries: string[]
    stock_location_name: string
    sales_channel_name: string
  }
  contact: {
    public_email?: string
    public_phone?: string
    whatsapp_number?: string
  }
  domain: {
    custom_hostname?: string
  }
}

export type ProvisionStoreResult = {
  provisioning_id: string
  status: "completed"
  handle: string
  public_domain: string
  custom_domain: string | null
  owner_email: string
  plan_code: string
}

export type DashboardRoute =
  | "overview"
  | "requests"
  | "clients"
  | "storefronts"
  | "domains"
  | "deployments"
  | "vendor-accounts"
  | "billing"
  | "operations"
  | "security"
  | "settings"
  | "commerce"

