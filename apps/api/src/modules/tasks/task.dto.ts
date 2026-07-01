import type { TaskDocument } from "./task.model";

export interface TaskDto {
  assigneeIds: string[];
  assignedTo?: string;
  blockedReason?: string;
  category: string;
  completedAt?: Date;
  createdAt?: Date;
  createdBy?: string;
  description?: string;
  dueDate?: Date;
  id: string;
  lastProgressUpdateAt?: Date;
  mainModule?: string;
  priority: string;
  progress: number;
  requestId?: string;
  reviewedBy?: string;
  startDate?: Date;
  status: string;
  subModule?: string;
  taskCode: string;
  title: string;
  updatedAt?: Date;
}

export function serializeTask(task: TaskDocument): TaskDto {
  const assigneeIds = getTaskAssigneeIds(task);

  return {
    assigneeIds,
    ...(task.assignedTo ? { assignedTo: String(task.assignedTo) } : {}),
    ...(task.blockedReason ? { blockedReason: task.blockedReason } : {}),
    category: task.category,
    ...(task.completedAt ? { completedAt: task.completedAt } : {}),
    ...(task.createdAt ? { createdAt: task.createdAt } : {}),
    ...(task.createdBy ? { createdBy: String(task.createdBy) } : {}),
    ...(task.description ? { description: task.description } : {}),
    ...(task.dueDate ? { dueDate: task.dueDate } : {}),
    id: String(task._id),
    ...(task.lastProgressUpdateAt
      ? { lastProgressUpdateAt: task.lastProgressUpdateAt }
      : {}),
    ...(task.mainModule ? { mainModule: task.mainModule } : {}),
    priority: task.priority,
    progress: task.progress,
    ...(task.requestId ? { requestId: String(task.requestId) } : {}),
    ...(task.reviewedBy ? { reviewedBy: String(task.reviewedBy) } : {}),
    ...(task.startDate ? { startDate: task.startDate } : {}),
    status: task.status,
    ...(task.subModule ? { subModule: task.subModule } : {}),
    taskCode: task.taskCode,
    title: task.title,
    ...(task.updatedAt ? { updatedAt: task.updatedAt } : {})
  };
}

function getTaskAssigneeIds(task: TaskDocument): string[] {
  const assigneeIds = new Set(
    (task.assigneeIds ?? []).map((assigneeId) => String(assigneeId))
  );

  if (task.assignedTo) {
    assigneeIds.add(String(task.assignedTo));
  }

  return [...assigneeIds];
}
