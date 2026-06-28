import { Types } from "mongoose";

import { env } from "../../config/env";
import { AuditLogModel } from "../../modules/audit-logs/audit-log.model";
import type {
  AuditAction,
  AuditEntityType,
  AuditRequestContext
} from "./audit.types";

export interface PersistAuditLogInput {
  action: AuditAction;
  actorId?: string;
  context?: AuditRequestContext;
  entityId?: string;
  entityType: AuditEntityType;
  newValue?: unknown;
  oldValue?: unknown;
}

export async function persistAuditLog(
  input: PersistAuditLogInput
): Promise<void> {
  if (!env.AUDIT_LOG_ENABLED) {
    return;
  }

  await AuditLogModel.create({
    action: input.action,
    ...(input.actorId && Types.ObjectId.isValid(input.actorId)
      ? { actorId: new Types.ObjectId(input.actorId) }
      : {}),
    ...(input.entityId && Types.ObjectId.isValid(input.entityId)
      ? { entityId: new Types.ObjectId(input.entityId) }
      : {}),
    entityType: input.entityType,
    ...(input.context?.ipAddress ? { ipAddress: input.context.ipAddress } : {}),
    ...(input.newValue ? { newValue: input.newValue } : {}),
    ...(input.oldValue ? { oldValue: input.oldValue } : {}),
    ...(input.context?.userAgent ? { userAgent: input.context.userAgent } : {})
  });
}
