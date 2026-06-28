import { AuditLogModel } from "../modules/audit-logs/audit-log.model";
import { CommentModel } from "../modules/comments/comment.model";
import { ItRequestModel } from "../modules/it-requests/request.model";
import { PermissionModel } from "../modules/permissions/permission.model";
import { ProjectProgressModel } from "../modules/project-progress/project-progress.model";
import { RoleModel } from "../modules/roles/role.model";
import { SprintModel } from "../modules/sprints/sprint.model";
import { TaskUpdateModel } from "../modules/task-updates/task-update.model";
import { TaskModel } from "../modules/tasks/task.model";
import { UserModel } from "../modules/users/user.model";

export const databaseModels = [
  RoleModel,
  PermissionModel,
  ProjectProgressModel,
  UserModel,
  SprintModel,
  ItRequestModel,
  TaskModel,
  TaskUpdateModel,
  CommentModel,
  AuditLogModel
] as const;
