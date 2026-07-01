import type { Request } from "express";

export const AUDIT_ENTITY_TYPES = [
  "role",
  "permission",
  "project_progress",
  "user",
  "sprint",
  "request",
  "task",
  "task_update",
  "comment",
  "audit_log"
] as const;

export const AUDIT_ACTIONS = [
  "create",
  "delete",
  "update",
  "change_status",
  "assign",
  "review",
  "comment",
  "login_failed",
  "login_succeeded",
  "logout",
  "password_changed"
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export interface AuditRequestContext {
  ipAddress?: string;
  requestId?: string;
  userAgent?: string;
}

export interface AuditEvent {
  action: AuditAction;
  actorId?: string;
  context?: AuditRequestContext;
  entityId?: string;
  entityType: AuditEntityType;
  newValue?: unknown;
  oldValue?: unknown;
}

export function getAuditRequestContext(req: Request): AuditRequestContext {
  return {
    ...(req.ip ? { ipAddress: req.ip } : {}),
    ...(req.res?.locals.requestId ? { requestId: req.res.locals.requestId } : {}),
    ...(req.get("user-agent") ? { userAgent: req.get("user-agent") } : {})
  };
}
