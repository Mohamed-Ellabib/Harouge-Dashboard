import { MedusaService } from "@medusajs/framework/utils"

import MerchantMembership from "./models/merchant-membership"
import CheckoutOwnershipRepair from "./models/checkout-ownership-repair"
import StoreBrand from "./models/store-brand"
import StoreDomain from "./models/store-domain"
import StoreProfile from "./models/store-profile"
import StoreProvisioning from "./models/store-provisioning"
import StoreProvisioningEvent from "./models/store-provisioning-event"
import StoreProvisioningLease from "./models/store-provisioning-lease"
import Tenant from "./models/tenant"

class SaasModuleService extends MedusaService({
  Tenant,
  StoreProfile,
  StoreDomain,
  StoreBrand,
  MerchantMembership,
  CheckoutOwnershipRepair,
  StoreProvisioning,
  StoreProvisioningEvent,
  StoreProvisioningLease
}) {}

export default SaasModuleService
