import { z } from "zod";

import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES
} from "../../shared/audit/audit.types";
import {
  enumSchema,
  mongoObjectIdSchema
} from "../../shared/validation/common-schemas";
import { baseListQuerySchema } from "../../shared/validation/list-query-schemas";

export const auditLogIdParamsSchema = z.object({
  id: mongoObjectIdSchema
});

export const auditLogListQuerySchema = baseListQuerySchema.extend({
  action: enumSchema(AUDIT_ACTIONS).optional(),
  actorId: mongoObjectIdSchema.optional(),
  entityId: mongoObjectIdSchema.optional(),
  entityType: enumSchema(AUDIT_ENTITY_TYPES).optional()
});

export type AuditLogIdParams = z.infer<typeof auditLogIdParamsSchema>;
export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
