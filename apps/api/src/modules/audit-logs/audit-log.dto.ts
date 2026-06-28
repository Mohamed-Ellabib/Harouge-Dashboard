import type { AuditLogDocument } from "./audit-log.model";

export interface AuditLogListItemDto {
  action: string;
  actorId?: string;
  createdAt?: Date;
  entityDisplayName?: string;
  entityId?: string;
  entityReferenceCode?: string;
  entityType: string;
  id: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogDto extends AuditLogListItemDto {
  newValue?: unknown;
  oldValue?: unknown;
}

export function serializeAuditLogListItem(
  auditLog: AuditLogDocument
): AuditLogListItemDto {
  return {
    action: auditLog.action,
    ...(auditLog.actorId ? { actorId: String(auditLog.actorId) } : {}),
    ...(auditLog.createdAt ? { createdAt: auditLog.createdAt } : {}),
    ...buildEntitySummary(auditLog),
    ...(auditLog.entityId ? { entityId: String(auditLog.entityId) } : {}),
    entityType: auditLog.entityType,
    id: String(auditLog._id),
    ...(auditLog.ipAddress ? { ipAddress: auditLog.ipAddress } : {}),
    ...(auditLog.userAgent ? { userAgent: auditLog.userAgent } : {})
  };
}

export function serializeAuditLog(auditLog: AuditLogDocument): AuditLogDto {
  return {
    ...serializeAuditLogListItem(auditLog),
    ...(auditLog.newValue !== undefined ? { newValue: auditLog.newValue } : {}),
    ...(auditLog.oldValue !== undefined ? { oldValue: auditLog.oldValue } : {})
  };
}

function buildEntitySummary(
  auditLog: AuditLogDocument
): Pick<AuditLogListItemDto, "entityDisplayName" | "entityReferenceCode"> {
  const newValue = readAuditObject(auditLog.newValue);
  const oldValue = readAuditObject(auditLog.oldValue);
  const displaySource = newValue ?? oldValue;
  const codeSource = newValue ?? oldValue;
  const entityDisplayName = displaySource
    ? readFirstString(displaySource, [
        "title",
        "name",
        "fullName",
        "displayName",
        "email",
        "body",
        "description"
      ])
    : undefined;
  const entityReferenceCode = codeSource
    ? readFirstString(codeSource, [
        "taskCode",
        "requestCode",
        "code",
        "employeeId",
        "seedKey"
      ])
    : undefined;

  return {
    ...(entityDisplayName ? { entityDisplayName } : {}),
    ...(entityReferenceCode ? { entityReferenceCode } : {})
  };
}

function readAuditObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readFirstString(
  value: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const field = value[key];

    if (typeof field === "string" && field.trim()) {
      return field.trim();
    }
  }

  return undefined;
}
