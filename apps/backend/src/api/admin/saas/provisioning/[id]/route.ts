import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { SAAS_MODULE } from "../../../../../modules/saas";
import {
  cancelProvisioningAttempt,
  serializeProvisioningStatus,
} from "../../../../../workflows/provisioning-state";

const platformActorId = (req: MedusaRequest): string => {
  const actorId = (req as any).auth_context?.actor_id;

  if (typeof actorId !== "string" || !actorId) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "Platform administrator authentication is required.",
    );
  }

  return actorId;
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  platformActorId(req);
  const saas = req.scope.resolve(SAAS_MODULE) as any;
  const record = await saas.retrieveStoreProvisioning(req.params.id);

  return res.json({ provisioning: serializeProvisioningStatus(record) });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const result = await cancelProvisioningAttempt(
    req.scope,
    req.params.id,
    platformActorId(req),
  );

  return res.json({ provisioning: result });
}
