import { Router } from "express";

import { attachAuthContext } from "../middleware/auth-context";
import { csrfProtection } from "../middleware/csrf-protection";
import { enforceRequiredPasswordChange } from "../middleware/password-change-required";
import { auditLogRouter } from "../modules/audit-logs/audit-log.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { commentRouter } from "../modules/comments/comment.routes";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes";
import { healthRouter } from "../modules/health/health.routes";
import { permissionRouter } from "../modules/permissions/permission.routes";
import { projectProgressRouter } from "../modules/project-progress/project-progress.routes";
import { reportRouter } from "../modules/reports/report.routes";
import { requestRouter } from "../modules/it-requests/request.routes";
import { roleRouter } from "../modules/roles/role.routes";
import { sprintRouter } from "../modules/sprints/sprint.routes";
import { taskRouter } from "../modules/tasks/task.routes";
import { userRouter } from "../modules/users/user.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use(attachAuthContext);
apiRouter.use(csrfProtection);
apiRouter.use(enforceRequiredPasswordChange);
apiRouter.use("/auth", authRouter);
apiRouter.use("/roles", roleRouter);
apiRouter.use("/permissions", permissionRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/sprints", sprintRouter);
apiRouter.use("/requests", requestRouter);
apiRouter.use("/tasks", taskRouter);
apiRouter.use("/comments", commentRouter);
apiRouter.use("/audit-logs", auditLogRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/project-progress", projectProgressRouter);
apiRouter.use("/reports", reportRouter);
