import type { TaskUpdateDocument } from "./task-update.model";

export interface TaskUpdateDto {
  createdAt?: Date;
  id: string;
  newProgress?: number;
  newStatus?: string;
  note?: string;
  previousProgress?: number;
  previousStatus?: string;
  taskId: string;
  updatedBy?: string;
}

export function serializeTaskUpdate(
  taskUpdate: TaskUpdateDocument
): TaskUpdateDto {
  return {
    ...(taskUpdate.createdAt ? { createdAt: taskUpdate.createdAt } : {}),
    id: String(taskUpdate._id),
    ...(taskUpdate.newProgress !== undefined
      ? { newProgress: taskUpdate.newProgress }
      : {}),
    ...(taskUpdate.newStatus ? { newStatus: taskUpdate.newStatus } : {}),
    ...(taskUpdate.note ? { note: taskUpdate.note } : {}),
    ...(taskUpdate.previousProgress !== undefined
      ? { previousProgress: taskUpdate.previousProgress }
      : {}),
    ...(taskUpdate.previousStatus
      ? { previousStatus: taskUpdate.previousStatus }
      : {}),
    taskId: String(taskUpdate.taskId),
    ...(taskUpdate.updatedBy ? { updatedBy: String(taskUpdate.updatedBy) } : {})
  };
}
