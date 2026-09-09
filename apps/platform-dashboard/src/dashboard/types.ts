export type PlatformVendorStatus = "draft" | "active" | "suspended"

export type PlatformTenantStatus = "active" | "suspended" | "archived"
export type PlatformStoreStatus = "draft" | "active" | "suspended" | "archived"
export type PlatformPlanCode = "starter_whatsapp" | "professional_commerce"
export type CommerceReadinessStatus =
  | "not_required"
  | "pending"
  | "configuring"
  | "ready"
  | "failed"
  | "requires_attention"
  | "disabled"

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

export type PlatformStoreDomain = {
  id: string
  hostname: string
  type: "temporary" | "custom"
  verification_status: "pending" | "verified" | "failed"
  ssl_status: "pending" | "active" | "failed"
  is_primary: boolean
}

export type PlatformStoreMembership = {
  id: string
  email: string | null
  display_name: string | null
  role: "owner" | "manager"
  status: "active" | "disabled"
}

export type PlatformMerchantMembershipRole = "owner" | "manager"
export type PlatformMerchantAccessStatus = "active" | "disabled"
export type PlatformMerchantAccountStatus = PlatformMerchantAccessStatus | "unavailable"
export type PlatformMerchantStoreStatus = PlatformStoreStatus | "unavailable"

export type PlatformMerchantMembership = {
  id: string
  email: string | null
  display_name: string | null
  role: PlatformMerchantMembershipRole
  status: PlatformMerchantAccessStatus
  account_status: PlatformMerchantAccountStatus
  effective_access: PlatformMerchantAccessStatus
  joined_at: string | null
  store: {
    id: string
    name: string | null
    handle: string | null
    status: PlatformMerchantStoreStatus
    plan_code: PlatformPlanCode | null
  }
  account_store_count: number
}

export type PlatformMerchantMembershipSummary = {
  total_memberships: number
  distinct_accounts: number
  active_access: number
  disabled_access: number
  owner_memberships: number
  manager_memberships: number
}

export type PlatformMerchantMembershipList = {
  memberships: PlatformMerchantMembership[]
  count: number
  summary: PlatformMerchantMembershipSummary
}

export type PlatformMerchantMembershipQuery = {
  q?: string
  role?: PlatformMerchantMembershipRole
  status?: PlatformMerchantAccessStatus
  effective_access?: PlatformMerchantAccessStatus
  account_status?: PlatformMerchantAccountStatus
  offset?: number
  limit?: number
  signal?: AbortSignal
}

export type CreatePlatformMerchantMembershipRequest = {
  email: string
  display_name: string
  role: PlatformMerchantMembershipRole
  reuse_existing_account: boolean
  initial_password?: string
}

export type UpdatePlatformMerchantMembershipRequest = {
  role?: PlatformMerchantMembershipRole
  status?: PlatformMerchantAccessStatus
}

export type PlatformMerchantMembershipMutationResult = {
  membership: PlatformMerchantMembership
  scope: "store"
}

export type CreatePlatformMerchantMembershipResult = {
  membership: PlatformMerchantMembership
  replayed: boolean
  created: boolean
}

export type PlatformMerchantAccount = {
  email: string | null
  display_name: string | null
  status: PlatformMerchantAccountStatus
}

export type PlatformMerchantAccountMutationResult = {
  account: PlatformMerchantAccount
  scope: "global"
  affected_store_count: number
}

export type CommerceReadiness = {
  id: string
  store_profile_id: string
  plan_code: PlatformPlanCode
  status: CommerceReadinessStatus
  last_setup_id?: string | null
  failure_code?: string | null
  failure_message?: string | null
  validated_at?: string | null
  updated_at?: string | null
}

export type CommerceSetupStatus = {
  id: string
  store_profile_id: string
  status: "pending" | "running" | "completed" | "failed" | "requires_attention" | "cancelled"
  current_step?: string | null
  retry_count?: number
  failure_code?: string | null
  failure_message?: string | null
  completed_at?: string | null
  updated_at?: string | null
}

export type PlatformStore = {
  id: string
  name: string
  handle: string
  status: PlatformStoreStatus
  plan_code: PlatformPlanCode
  locale: string
  timezone: string
  contact: {
    public_email: string | null
    public_phone: string | null
    whatsapp_number: string | null
  }
  brand: {
    logo_url: string | null
    favicon_url: string | null
    primary_color: string | null
    secondary_color: string | null
    typography_key: string | null
  } | null
  domains: PlatformStoreDomain[]
  memberships: PlatformStoreMembership[]
  product_count: number
  compatibility_vendor: {
    id: string
    status: PlatformVendorStatus
  } | null
  provisioning: ProvisioningStatus | null
  commerce_readiness: CommerceReadiness | null
  commerce_setup: CommerceSetupStatus | null
  created_at?: string | null
  updated_at?: string | null
}

export type PlatformStoreConfiguration = {
  name: string
  locale: string
  contact: {
    public_email: string | null
    public_phone: string | null
    whatsapp_number: string | null
  }
  brand: {
    logo_url: string | null
    primary_color: string | null
    secondary_color: string | null
    typography_key: string | null
  }
}

export type PlatformStoreConfigurationUpdate = Omit<
  PlatformStoreConfiguration,
  "locale" | "brand"
> & {
  locale: "ar-LY" | "en-LY"
  brand: Omit<PlatformStoreConfiguration["brand"], "typography_key"> & {
    typography_key: "cairo" | null
  }
}

export type PlatformStoreConfigurationRecord = {
  configuration: PlatformStoreConfiguration
  revision: number
  updated_at: string | null
  updated_by: string | null
}

export type PlatformStorefrontTemplateKey =
  | "luxe-commerce"
  | "luxe-commerce-full"
  | "modern-market"
  | "home-living"
  | "standard"
  | "glow-beauty"
  | "drops"
  | "urbx"
  | "template-6"

export type PlatformStorefrontLocalizedText = {
  ar: string
  en: string
}

export type PlatformStorefrontHeroSlide = {
  id: string
  image_url: string
  alt: PlatformStorefrontLocalizedText
  enabled: boolean
}

export type PlatformStorefrontHeroButton = {
  id: string
  label: PlatformStorefrontLocalizedText
  href: string
  background_color: string
  text_color: string
  style: "solid" | "outline"
  enabled: boolean
}

export type PlatformStorefrontBenefitIcon =
  | "award"
  | "shield"
  | "truck"
  | "package"
  | "check"
  | "heart"
  | "globe"
  | "clock"
  | "headset"
  | "sparkle"

export type PlatformStorefrontHeroBenefit = {
  id: string
  icon: PlatformStorefrontBenefitIcon
  title: PlatformStorefrontLocalizedText
  subtitle: PlatformStorefrontLocalizedText
}

export type PlatformStorefrontBrand = {
  id: string
  name: PlatformStorefrontLocalizedText
  slug: string
  image_url: string | null
  banner_image_url?: string | null
}

export type PlatformStorefrontNavigationKey =
  | "home"
  | "categories"
  | "favorites"
  | "cart"
  | "account"
  | "orders"
  | "settings"

export type StorefrontAppearance = {
  text_color?: string
  heading_color?: string
  muted_text_color?: string
  button_text_color?: string
  surface_color?: string
  navbar_background?: string
  navbar_text_color?: string
  navbar_active_color?: string
  body_font?: "original" | "cairo" | "manrope" | "condensed" | "anton" | "marker" | "system" | "serif"
  heading_font?: "original" | "cairo" | "manrope" | "condensed" | "anton" | "marker" | "system" | "serif"
}

export type PlatformStorefrontDocument = {
  appearance?: StorefrontAppearance
  schema_version: 1
  template_key: PlatformStorefrontTemplateKey
  navigation: {
    items: Array<{
      key: PlatformStorefrontNavigationKey
      label: PlatformStorefrontLocalizedText
      enabled: boolean
    }>
  }
  hero: {
    eyebrow: PlatformStorefrontLocalizedText
    heading: PlatformStorefrontLocalizedText
    subheading: PlatformStorefrontLocalizedText
    cta_label: PlatformStorefrontLocalizedText
    cta_target: "catalog" | "contact"
    image_url: string | null
    slides: PlatformStorefrontHeroSlide[]
    buttons: PlatformStorefrontHeroButton[]
    benefits: PlatformStorefrontHeroBenefit[]
  }
  home?: {
    eyebrow: PlatformStorefrontLocalizedText
    heading: PlatformStorefrontLocalizedText
    statement: PlatformStorefrontLocalizedText
    cta_label: PlatformStorefrontLocalizedText
    categories_heading: PlatformStorefrontLocalizedText
    products_heading: PlatformStorefrontLocalizedText
    view_all_label: PlatformStorefrontLocalizedText
    promotion_eyebrow: PlatformStorefrontLocalizedText
    promotion_heading: PlatformStorefrontLocalizedText
    promotion_detail: PlatformStorefrontLocalizedText
    image_url: string
    promotion_image_url: string
  }
  shop?: {
    heading: PlatformStorefrontLocalizedText
    statement: PlatformStorefrontLocalizedText
    search_placeholder: PlatformStorefrontLocalizedText
  }
  brands: {
    heading: PlatformStorefrontLocalizedText
    subheading: PlatformStorefrontLocalizedText
    search_placeholder?: PlatformStorefrontLocalizedText
    explore_label?: PlatformStorefrontLocalizedText
    view_all_label?: PlatformStorefrontLocalizedText
    promotion_heading?: PlatformStorefrontLocalizedText
    promotion_subheading?: PlatformStorefrontLocalizedText
    promotion_image_url?: string | null
    items: PlatformStorefrontBrand[]
  }
  about: {
    title: PlatformStorefrontLocalizedText
    body: PlatformStorefrontLocalizedText
  }
  contact: {
    heading: PlatformStorefrontLocalizedText
    body: PlatformStorefrontLocalizedText
  }
  policies: {
    delivery: {
      title: PlatformStorefrontLocalizedText
      body: PlatformStorefrontLocalizedText
    }
    returns: {
      title: PlatformStorefrontLocalizedText
      body: PlatformStorefrontLocalizedText
    }
    privacy: {
      title: PlatformStorefrontLocalizedText
      body: PlatformStorefrontLocalizedText
    }
    terms: {
      title: PlatformStorefrontLocalizedText
      body: PlatformStorefrontLocalizedText
    }
  }
}

export type PlatformStorefrontBankTransfer = {
  bank_name: string | null
  account_holder_name: string | null
  account_reference: string | null
  instructions: PlatformStorefrontLocalizedText
}

export type PlatformStorefrontStatus =
  | "unpublished"
  | "published"
  | "draft_changes"

export type PlatformStorefrontRecord = {
  storefront: {
    revision: number
    latest_revision: number
    published_revision: number | null
    status: PlatformStorefrontStatus
    document: PlatformStorefrontDocument
    bank_transfer: PlatformStorefrontBankTransfer
    updated_at: string | null
    updated_by: string | null
    published_at: string | null
    published_by: string | null
  }
}

export type PlatformStorefrontStarterResult = PlatformStorefrontRecord & {
  starter: {
    template_key: "glow-beauty"
    catalog_status: "created" | "already_installed"
    product_count: number
  }
}

export type PlatformStorefrontTemplate = {
  key: PlatformStorefrontTemplateKey
  label: string
  description: string
  status: "active"
  assignments: {
    total: number
    published: number
    draft_only: number
    unpublished_changes: number
  }
}

export type PlatformStorefrontTemplateCatalog = {
  templates: PlatformStorefrontTemplate[]
  creation_previews: Partial<Record<PlatformStorefrontTemplateKey, import("./creation-drafts").CreationValues>>
}

export type PlatformStorefrontPreviewProduct = {
  handle: string | null
  title: string
  subtitle: string | null
  description: string | null
  thumbnail_url: string | null
  image_urls: string[]
  price_lyd: number | null
  compare_at_price_lyd: number | null
  category: string | null
  badge: string | null
  options: Array<{ name: "size" | "color"; values: string[] }>
  variants: Array<{
    id: string
    title: string
    options: { size?: string; color?: string }
    unit_price: number
    available_for_sale: boolean
  }>
}

export type PlatformStorefrontPreview = {
  name: string
  handle: string
  domain: string | null
  locale: string
  contact: {
    public_email: string | null
    public_phone: string | null
    whatsapp_number: string | null
  }
  branding: {
    logo_url: string | null
    primary_color: string | null
    secondary_color: string | null
    typography_key: string | null
  }
  products: PlatformStorefrontPreviewProduct[]
  product_count: number
}

export type PlatformClient = {
  id: string
  key: string | null
  name: string
  status: PlatformTenantStatus
  stores: PlatformStore[]
  created_at?: string | null
  updated_at?: string | null
}

export type PlatformPortfolioSummary = {
  active_clients: number
  total_stores: number
  active_stores: number
  commerce_ready: number
  needs_attention: number
}

export type PlatformPortfolio = {
  clients: PlatformClient[]
  count: number
  summary: PlatformPortfolioSummary
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
    plan_code: PlatformPlanCode
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
  tenant_id: string
  store_profile_id: string
  handle: string
  public_domain: string
  custom_domain: string | null
  owner_email: string
  plan_code: string
}

export type CommerceSetupRequest = {
  shipping_option: {
    name: string
    description?: string
    amount: number
  }
}

export type CommerceSetupResult = {
  setup_id: string
  status: "completed"
  readiness_status: "ready"
  store_profile_id: string
  currency_code: string
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
  | "analytics"
  | "security"
  | "settings"
  | "commerce"

export type PlatformSettings = {
  platformName: string
  companyName: string
  logoUrl: string | null
  systemEmail: string
  supportEmail: string
  companyWebsite: string
}

export type PlatformSettingsRecord = {
  settings: PlatformSettings
  revision: number
  updated_at: string | null
  updated_by: string | null
}

export type PlatformUser = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  status: "active" | "disabled"
  role: "Super Admin"
  created_at: string | null
  updated_at: string | null
}

export type CreatePlatformUserRequest = {
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  password: string
}

export type UpdatePlatformUserRequest = {
  email?: string
  first_name?: string
  last_name?: string
  avatar_url?: string | null
  status?: "active" | "disabled"
}
