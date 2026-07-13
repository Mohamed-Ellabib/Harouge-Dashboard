import { Module } from "@medusajs/framework/utils"

import SaasModuleService from "./service"

export const SAAS_MODULE = "saas"

export default Module(SAAS_MODULE, {
  service: SaasModuleService,
})
