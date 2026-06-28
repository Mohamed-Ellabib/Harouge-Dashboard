import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types
} from "mongoose";

import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  type AuditAction,
  type AuditEntityType
} from "../../shared/audit/audit.types";
import { createCreatedAtOnlySchemaOptions } from "../../shared/database/schema-options";

export interface AuditLog {
  action: AuditAction;
  actorId?: Types.ObjectId;
  createdAt?: Date;
  entityId?: Types.ObjectId;
  entityType: AuditEntityType;
  ipAddress?: string;
  newValue?: unknown;
  oldValue?: unknown;
  userAgent?: string;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;

const auditLogSchema = new Schema<AuditLog>(
  {
    action: {
      enum: AUDIT_ACTIONS,
      required: true,
      trim: true,
      type: String
    },
    actorId: {
      ref: "User",
      type: Schema.Types.ObjectId
    },
    entityId: {
      type: Schema.Types.ObjectId
    },
    entityType: {
      enum: AUDIT_ENTITY_TYPES,
      required: true,
      trim: true,
      type: String
    },
    ipAddress: {
      trim: true,
      type: String
    },
    newValue: {
      type: Schema.Types.Mixed
    },
    oldValue: {
      type: Schema.Types.Mixed
    },
    userAgent: {
      trim: true,
      type: String
    }
  },
  createCreatedAtOnlySchemaOptions("audit_logs")
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: 1 });
auditLogSchema.index({ actorId: 1, createdAt: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel =
  (models.AuditLog as Model<AuditLog> | undefined) ??
  model<AuditLog>("AuditLog", auditLogSchema);
