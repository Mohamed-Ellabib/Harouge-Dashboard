export interface ReportUserReferenceDto {
  department?: string;
  email: string;
  fullName: string;
  id: string;
  jobTitle?: string;
}

export interface ReportRequestReferenceDto {
  id: string;
  requestCode: string;
  title: string;
}

export interface RequestReportRowDto {
  assignedTo?: ReportUserReferenceDto;
  closedAt?: Date;
  createdAt?: Date;
  id: string;
  priority: string;
  requestCode: string;
  requestedBy?: ReportUserReferenceDto;
  requestedForDepartment?: string;
  requiredDate?: Date;
  status: string;
  title: string;
  type: string;
}

export interface TaskReportRowDto {
  assignees: ReportUserReferenceDto[];
  assignedTo?: ReportUserReferenceDto;
  category: string;
  completedAt?: Date;
  createdAt?: Date;
  createdBy?: ReportUserReferenceDto;
  dueDate?: Date;
  id: string;
  lastProgressUpdateAt?: Date;
  mainModule?: string;
  priority: string;
  progress: number;
  request?: ReportRequestReferenceDto;
  reviewedBy?: ReportUserReferenceDto;
  startDate?: Date;
  status: string;
  subModule?: string;
  taskCode: string;
  title: string;
}
