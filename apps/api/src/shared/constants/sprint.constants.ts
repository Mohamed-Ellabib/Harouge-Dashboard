export const SPRINT_AREAS = [
  "development",
  "facility",
  "infrastructure"
] as const;

export const SPRINT_STATUSES = [
  "planned",
  "in_progress",
  "at_risk",
  "completed",
  "cancelled"
] as const;

export type SprintArea = (typeof SPRINT_AREAS)[number];
export type SprintStatus = (typeof SPRINT_STATUSES)[number];
