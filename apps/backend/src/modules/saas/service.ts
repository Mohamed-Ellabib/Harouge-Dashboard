import { MedusaService } from "@medusajs/framework/utils"

import MerchantMembership from "./models/merchant-membership"
import StoreBrand from "./models/store-brand"
import StoreDomain from "./models/store-domain"
import StoreProfile from "./models/store-profile"
import Tenant from "./models/tenant"

class SaasModuleService extends MedusaService({
  Tenant,
  StoreProfile,
  StoreDomain,
  StoreBrand,
  MerchantMembership,
}) {}

export default SaasModuleService
