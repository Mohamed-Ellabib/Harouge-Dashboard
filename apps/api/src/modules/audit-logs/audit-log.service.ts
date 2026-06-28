import { Types } from "mongoose";

import { assertEnterpriseAdmin } from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import { buildSort, escapeRegex } from "../../shared/database";
import { AppError } from "../../shared/errors/app-error";
import {
  buildPaginationMeta,
  type PaginationMeta
} from "../../shared/pagination/pagination";

import {
  serializeAuditLog,
  serializeAuditLogListItem,
  type AuditLogDto,
  type AuditLogListItemDto
} from "./audit-log.dto";
import { AuditLogModel } from "./audit-log.model";
import type { AuditLogListQuery } from "./audit-log.validation";

export interface AuditLogActionContext {
  actor?: AuthenticatedUserContext;
}

export interface AuditLogListResult {
  data: AuditLogListItemDto[];
  pagination: PaginationMeta;
}

const allowedAuditLogSortFields = [
  "action",
  "actorId",
  "createdAt",
  "entityType",
  "ipAddress"
] as const;

export async function listAuditLogs(
  query: AuditLogListQuery,
  context: AuditLogActionContext
): Promise<AuditLogListResult> {
  assertEnterpriseAdmin(context.actor, "Audit log access requires manager access");

  const filter = buildAuditLogFilter(query);
  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    allowedAuditLogSortFields,
    "createdAt"
  );
  const skip = (query.page - 1) * query.limit;
  const [auditLogs, totalItems] = await Promise.all([
    AuditLogModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    AuditLogModel.countDocuments(filter)
  ]);

  return {
    data: auditLogs.map(serializeAuditLogListItem),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

export async function getAuditLogById(
  id: string,
  context: AuditLogActionContext
): Promise<AuditLogDto> {
  assertEnterpriseAdmin(context.actor, "Audit log access requires manager access");

  const auditLog = await AuditLogModel.findById(id);

  if (!auditLog) {
    throw new AppError(404, "audit_log_not_found", "Audit log not found");
  }

  return serializeAuditLog(auditLog);
}

function buildAuditLogFilter(
  query: AuditLogListQuery
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (query.action) {
    filter.action = query.action;
  }

  if (query.actorId) {
    filter.actorId = new Types.ObjectId(query.actorId);
  }

  if (query.entityId) {
    filter.entityId = new Types.ObjectId(query.entityId);
  }

  if (query.entityType) {
    filter.entityType = query.entityType;
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {})
    };
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [
      { action: regex },
      { entityType: regex },
      { ipAddress: regex },
      { userAgent: regex }
    ];
  }

  return filter;
}
