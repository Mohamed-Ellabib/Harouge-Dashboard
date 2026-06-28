export const REQUEST_STATUSES = [
  "draft",
  "submitted",
  "assigned",
  "in_progress",
  "completed",
  "rejected",
  "cancelled",
  "closed"
] as const;

export const REQUEST_TYPES = [
  "support",
  "access",
  "hardware",
  "software",
  "network",
  "server",
  "other"
] as const;

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];
