import { MedusaService } from "@medusajs/framework/utils"

import Vendor from "./models/vendor"
import VendorDomain from "./models/vendor-domain"
import VendorMember from "./models/vendor-member"

class MarketplaceModuleService extends MedusaService({
  Vendor,
  VendorDomain,
  VendorMember,
}) {}

export default MarketplaceModuleService
