import { PRIORITIES } from "./request.constants";

export const TASK_STATUSES = [
  "open",
  "assigned",
  "in_progress",
  "blocked",
  "waiting_review",
  "completed",
  "cancelled"
] as const;

export const TASK_CATEGORIES = [
  "support",
  "network",
  "server",
  "software",
  "hardware",
  "access",
  "maintenance",
  "other"
] as const;

export const TASK_PRIORITIES = PRIORITIES;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
