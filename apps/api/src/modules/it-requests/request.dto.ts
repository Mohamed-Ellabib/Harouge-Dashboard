import type { ItRequestDocument } from "./request.model";

export interface RequestDto {
  assignedTo?: string;
  closedAt?: Date;
  createdAt?: Date;
  description?: string;
  id: string;
  priority: string;
  requestCode: string;
  requestedBy?: string;
  requestedForDepartment?: string;
  requiredDate?: Date;
  status: string;
  title: string;
  type: string;
  updatedAt?: Date;
}

export function serializeRequest(request: ItRequestDocument): RequestDto {
  return {
    ...(request.assignedTo ? { assignedTo: String(request.assignedTo) } : {}),
    ...(request.closedAt ? { closedAt: request.closedAt } : {}),
    ...(request.createdAt ? { createdAt: request.createdAt } : {}),
    ...(request.description ? { description: request.description } : {}),
    id: String(request._id),
    priority: request.priority,
    requestCode: request.requestCode,
    ...(request.requestedBy ? { requestedBy: String(request.requestedBy) } : {}),
    ...(request.requestedForDepartment
      ? { requestedForDepartment: request.requestedForDepartment }
      : {}),
    ...(request.requiredDate ? { requiredDate: request.requiredDate } : {}),
    status: request.status,
    title: request.title,
    type: request.type,
    ...(request.updatedAt ? { updatedAt: request.updatedAt } : {})
  };
}
