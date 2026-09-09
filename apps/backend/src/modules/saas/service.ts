import { MedusaService } from "@medusajs/framework/utils"

import MerchantMembership from "./models/merchant-membership"
import PlatformSetting from "./models/platform-setting"
import CheckoutOwnershipRepair from "./models/checkout-ownership-repair"
import StoreBrand from "./models/store-brand"
import StoreCommerceReadiness from "./models/store-commerce-readiness"
import StoreCommerceSetup from "./models/store-commerce-setup"
import StoreCommerceSetupEvent from "./models/store-commerce-setup-event"
import StoreCommerceSetupLease from "./models/store-commerce-setup-lease"
import StoreDomain from "./models/store-domain"
import StoreProfile from "./models/store-profile"
import StorefrontDocument from "./models/storefront-document"
import StorefrontDocumentRevision from "./models/storefront-document-revision"
import StoreManualBankTransferConfiguration from "./models/store-manual-bank-transfer-configuration"
import StoreProvisioning from "./models/store-provisioning"
import StoreProvisioningEvent from "./models/store-provisioning-event"
import StoreProvisioningLease from "./models/store-provisioning-lease"
import Tenant from "./models/tenant"
import StoreCreationDraft from "./models/store-creation-draft"
import StoreCreationTrial from "./models/store-creation-trial"
import StoreOrderProgress from "./models/store-order-progress"
import StoreOrderTrackingGrant from "./models/store-order-tracking-grant"

class SaasModuleService extends MedusaService({
  Tenant,
  StoreCreationDraft,
  StoreCreationTrial,
  StoreOrderProgress,
  StoreOrderTrackingGrant,
  StoreProfile,
  StorefrontDocument,
  StorefrontDocumentRevision,
  StoreManualBankTransferConfiguration,
  StoreDomain,
  StoreBrand,
  StoreCommerceReadiness,
  StoreCommerceSetup,
  StoreCommerceSetupEvent,
  StoreCommerceSetupLease,
  MerchantMembership,
  PlatformSetting,
  CheckoutOwnershipRepair,
  StoreProvisioning,
  StoreProvisioningEvent,
  StoreProvisioningLease
}) {}

export default SaasModuleService
