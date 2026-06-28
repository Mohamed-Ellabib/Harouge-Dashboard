import type { CommentDto } from "../comments/comment.dto";
import type { TaskUpdateDto } from "../task-updates/task-update.dto";

export interface CountByValueDto {
  count: number;
  value: string;
}

export interface DashboardWeekWindowDto {
  endAt: Date;
  startAt: Date;
}

export interface DashboardRequestMetricsDto {
  byPriority: CountByValueDto[];
  byStatus: CountByValueDto[];
  byType: CountByValueDto[];
  closedThisWeek: number;
  inProgress: number;
  open: number;
}

export interface DashboardTaskMetricsDto {
  active: number;
  averageProgress: number;
  blocked: number;
  byCategory: CountByValueDto[];
  byPriority: CountByValueDto[];
  byStatus: CountByValueDto[];
  completedThisWeek: number;
  overdue: number;
  waitingReview: number;
}

export interface DashboardUserMetricsDto {
  byStatus: CountByValueDto[];
}

export interface DashboardSummaryDto {
  generatedAt: Date;
  requests: DashboardRequestMetricsDto;
  tasks: DashboardTaskMetricsDto;
  timezone: string;
  users?: DashboardUserMetricsDto;
  week: DashboardWeekWindowDto;
}

export interface DashboardActivityDto {
  comments: CommentDto[];
  taskUpdates: TaskUpdateDto[];
}

export interface DashboardUserReferenceDto {
  department?: string;
  email: string;
  fullName: string;
  id: string;
  jobTitle?: string;
}

export interface DashboardFocusItemDto {
  createdAt?: Date;
  department?: string;
  dueAt?: Date;
  id: string;
  itemCode: string;
  itemType: "request" | "task";
  priority: string;
  status: string;
  title: string;
}

export interface DashboardWorkQueueItemDto {
  assignees: DashboardUserReferenceDto[];
  assignedTo?: DashboardUserReferenceDto;
  dueDate?: Date;
  id: string;
  priority: string;
  progress: number;
  status: string;
  taskCode: string;
  title: string;
}

export interface DashboardWorkloadItemDto {
  activeTaskCount: number;
  overdueTaskCount: number;
  status: "critical" | "healthy" | "warning";
  urgentTaskCount: number;
  user: DashboardUserReferenceDto;
  workloadPercent: number;
}

export interface DashboardRecentRequestItemDto {
  createdAt?: Date;
  id: string;
  priority: string;
  requestedBy?: DashboardUserReferenceDto;
  requestedForDepartment?: string;
  requestCode: string;
  status: string;
  title: string;
}

export interface DashboardRecentActivityItemDto {
  actor?: DashboardUserReferenceDto;
  createdAt?: Date;
  id: string;
  message: string;
  targetCode?: string;
  tone: "blue" | "green" | "orange" | "red";
  type: "comment" | "task_update";
}

export interface DashboardOverviewDto {
  focusItems: DashboardFocusItemDto[];
  recentActivity: DashboardRecentActivityItemDto[];
  recentRequests: DashboardRecentRequestItemDto[];
  summary: DashboardSummaryDto;
  workQueue: DashboardWorkQueueItemDto[];
  workload: DashboardWorkloadItemDto[];
}
