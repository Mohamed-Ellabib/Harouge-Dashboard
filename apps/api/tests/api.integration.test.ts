import type { Application } from "express";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from "vitest";

const managerPassword = "Manager-Test-Password-2026";
const employeePassword = "Employee-Test-Password-2026";
const superAdminPassword = "Super-Admin-Test-Password-2026";
const viewerPassword = "Viewer-Test-Password-2026";

let replicaSet: MongoMemoryReplSet;
let app: Application;
let disconnectDatabase: () => Promise<void>;
let UserModel: typeof import("../src/modules/users/user.model").UserModel;
let RoleModel: typeof import("../src/modules/roles/role.model").RoleModel;
let PermissionModel: typeof import("../src/modules/permissions/permission.model").PermissionModel;
let SprintModel: typeof import("../src/modules/sprints/sprint.model").SprintModel;
let ItRequestModel: typeof import("../src/modules/it-requests/request.model").ItRequestModel;
let TaskModel: typeof import("../src/modules/tasks/task.model").TaskModel;
let TaskUpdateModel: typeof import("../src/modules/task-updates/task-update.model").TaskUpdateModel;
let CommentModel: typeof import("../src/modules/comments/comment.model").CommentModel;
let AuditLogModel: typeof import("../src/modules/audit-logs/audit-log.model").AuditLogModel;

interface LoginResult {
  agent: ReturnType<typeof request.agent>;
  csrfToken: string;
}

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: "wiredTiger"
    }
  });

  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = replicaSet.getUri();
  process.env.MONGODB_DB_NAME = "itdcc_integration";
  process.env.MONGODB_AUTO_INDEX = "true";
  process.env.SESSION_SECRET = "integration-test-session-secret-that-is-longer-than-48-characters";
  process.env.COOKIE_SECURE = "false";
  process.env.COOKIE_SAME_SITE = "lax";
  process.env.BCRYPT_SALT_ROUNDS = "10";
  process.env.AUDIT_LOG_ENABLED = "true";
  process.env.RATE_LIMIT_MAX_REQUESTS = "1000";
  process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = "1000";

  vi.resetModules();

  const database = await import("../src/database/mongoose");
  disconnectDatabase = database.disconnectDatabase;
  await database.connectDatabase();

  ({ UserModel } = await import("../src/modules/users/user.model"));
  ({ RoleModel } = await import("../src/modules/roles/role.model"));
  ({ PermissionModel } = await import("../src/modules/permissions/permission.model"));
  ({ SprintModel } = await import("../src/modules/sprints/sprint.model"));
  ({ ItRequestModel } = await import("../src/modules/it-requests/request.model"));
  ({ TaskModel } = await import("../src/modules/tasks/task.model"));
  ({ TaskUpdateModel } = await import("../src/modules/task-updates/task-update.model"));
  ({ CommentModel } = await import("../src/modules/comments/comment.model"));
  ({ AuditLogModel } = await import("../src/modules/audit-logs/audit-log.model"));

  const { seedRoles } = await import("../src/database/seeds/seed-roles");
  const { seedPermissions } = await import("../src/database/seeds/seed-permissions");
  const { hashPassword } = await import("../src/shared/auth/passwords");
  const roleResult = await seedRoles();
  await seedPermissions(roleResult.rolesByName);

  const managerRole = roleResult.rolesByName.get("it_manager");
  const employeeRole = roleResult.rolesByName.get("employee");
  const superAdminRole = roleResult.rolesByName.get("super_admin");

  if (!managerRole || !employeeRole || !superAdminRole) {
    throw new Error("Required integration-test roles were not seeded.");
  }

  await UserModel.create([
    {
      email: "super.admin.integration@example.com",
      failedLoginCount: 0,
      fullName: "Integration Super Admin",
      mustChangePassword: false,
      passwordHash: await hashPassword(superAdminPassword),
      roleId: superAdminRole._id,
      sessionVersion: 0,
      status: "active"
    },
    {
      email: "manager.integration@example.com",
      failedLoginCount: 0,
      fullName: "Integration Manager",
      mustChangePassword: false,
      passwordHash: await hashPassword(managerPassword),
      roleId: managerRole._id,
      sessionVersion: 0,
      status: "active"
    },
    {
      email: "employee.integration@example.com",
      failedLoginCount: 0,
      fullName: "Integration Employee",
      mustChangePassword: true,
      passwordHash: await hashPassword(employeePassword),
      roleId: employeeRole._id,
      sessionVersion: 0,
      status: "active"
    },
    {
      email: "viewer.integration@example.com",
      failedLoginCount: 0,
      fullName: "Integration Viewer Employee",
      mustChangePassword: false,
      passwordHash: await hashPassword(viewerPassword),
      roleId: employeeRole._id,
      sessionVersion: 0,
      status: "active"
    }
  ]);

  app = (await import("../src/app")).createApp();
});

afterAll(async () => {
  vi.restoreAllMocks();
  await disconnectDatabase();
  await replicaSet.stop();
});

async function login(email: string, password: string): Promise<LoginResult> {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({ email, password });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);

  return {
    agent,
    csrfToken: response.body.data.csrfToken as string
  };
}

describe("API hardening", () => {
  it("reports a responsive database as healthy", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
  });

  it("restricts first-login users until they change their password", async () => {
    const session = await login(
      "employee.integration@example.com",
      employeePassword
    );

    const denied = await session.agent.get("/api/tasks");
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("password_change_required");

    const changed = await session.agent
      .post("/api/auth/change-password")
      .set("x-csrf-token", session.csrfToken)
      .send({
        currentPassword: employeePassword,
        newPassword: "Employee-Changed-Password-2026"
      });

    expect(changed.status).toBe(200);

    const allowed = await session.agent.get("/api/tasks");
    expect(allowed.status).toBe(200);

    const dashboardDenied = await session.agent.get("/api/dashboard/summary");
    expect(dashboardDenied.status).toBe(403);
    expect(dashboardDenied.body.error.code).toBe("permission_denied");

    const reportsAllowed = await session.agent.get("/api/reports/tasks");
    expect(reportsAllowed.status).toBe(200);

    const manager = await UserModel.findOne({
      email: "manager.integration@example.com"
    });
    const employee = await UserModel.findOne({
      email: "employee.integration@example.com"
    });
    const assignedTask = await TaskModel.create({
      assignedTo: employee?._id,
      category: "software",
      createdBy: manager?._id,
      priority: "medium",
      progress: 0,
      status: "open",
      taskCode: "TASK-INTEGRATION-EMPLOYEE-COMPLETE",
      title: "Employee-owned completion test"
    });
    const changedCsrfToken = changed.body.data.csrfToken as string;

    const progressResponse = await session.agent
      .post(`/api/tasks/${String(assignedTask._id)}/progress`)
      .set("x-csrf-token", changedCsrfToken)
      .send({ note: "Implementation completed.", progress: 100 });
    expect(progressResponse.status).toBe(200);
    expect(progressResponse.body.data.task.progress).toBe(100);
    expect(progressResponse.body.data.task.status).toBe("completed");
  });

  it("enforces CSRF on authenticated unsafe requests", async () => {
    const session = await login(
      "super.admin.integration@example.com",
      superAdminPassword
    );
    const manager = await UserModel.findOne({
      email: "manager.integration@example.com"
    });

    const response = await session.agent
      .patch(`/api/users/${String(manager?._id)}`)
      .send({ fullName: "Changed Without CSRF" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("csrf_token_invalid");
  });

  it("creates users with profile and access details", async () => {
    const employeeRole = await RoleModel.findOne({ name: "employee" });

    if (!employeeRole) {
      throw new Error("Employee role was not found.");
    }

    const session = await login(
      "super.admin.integration@example.com",
      superAdminPassword
    );
    const response = await session.agent
      .post("/api/users")
      .set("x-csrf-token", session.csrfToken)
      .send({
        department: "ERP",
        email: "created.user.integration@example.com",
        employeeId: "EMP-INT-001",
        fullName: "Created Integration User",
        jobTitle: "ERP Analyst",
        location: "Tripoli HQ",
        notes: "Created through the integration-test user workflow.",
        password: "Created-User-Password-2026!",
        phone: "0910000001",
        roleId: String(employeeRole._id),
        status: "active"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(
      "created.user.integration@example.com"
    );
    expect(response.body.data.user.employeeId).toBe("EMP-INT-001");
    expect(response.body.data.user.location).toBe("Tripoli HQ");
    expect(response.body.data.user.notes).toBe(
      "Created through the integration-test user workflow."
    );

    const persisted = await UserModel.findOne({
      email: "created.user.integration@example.com"
    });
    expect(persisted?.employeeId).toBe("EMP-INT-001");
    expect(persisted?.location).toBe("Tripoli HQ");
    expect(persisted?.notes).toBe(
      "Created through the integration-test user workflow."
    );
  });

  it("returns dashboard summary and recent activity", async () => {
    const manager = await UserModel.findOne({
      email: "manager.integration@example.com"
    });
    const employee = await UserModel.findOne({
      email: "employee.integration@example.com"
    });
    const dashboardRequest = await ItRequestModel.create({
      assignedTo: manager?._id,
      priority: "urgent",
      requestCode: "REQ-INTEGRATION-DASHBOARD",
      requestedBy: manager?._id,
      status: "assigned",
      title: "Dashboard integration request",
      type: "network"
    });
    const dashboardTask = await TaskModel.create({
      assignedTo: employee?._id,
      category: "network",
      createdBy: manager?._id,
      priority: "urgent",
      progress: 25,
      requestId: dashboardRequest._id,
      status: "in_progress",
      taskCode: "TASK-INTEGRATION-DASHBOARD",
      title: "Dashboard integration task"
    });

    await TaskUpdateModel.create({
      newProgress: 25,
      newStatus: "in_progress",
      note: "Dashboard activity update",
      previousProgress: 0,
      previousStatus: "open",
      taskId: dashboardTask._id,
      updatedBy: manager?._id
    });
    await CommentModel.create({
      body: "Dashboard activity comment",
      createdBy: manager?._id,
      isInternal: false,
      requestId: dashboardRequest._id
    });

    const session = await login(
      "manager.integration@example.com",
      managerPassword
    );
    const summaryResponse = await session.agent.get("/api/dashboard/summary");

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.data.summary.timezone).toBe("Africa/Tripoli");
    expect(summaryResponse.body.data.summary.requests.open).toBeGreaterThanOrEqual(1);
    expect(summaryResponse.body.data.summary.tasks.active).toBeGreaterThanOrEqual(1);
    expect(summaryResponse.body.data.summary.users.byStatus.length).toBeGreaterThan(0);

    const activityResponse = await session.agent.get(
      "/api/dashboard/activity?limit=5"
    );

    expect(activityResponse.status).toBe(200);
    expect(activityResponse.body.data.activity.taskUpdates.length).toBeGreaterThan(0);
    expect(activityResponse.body.data.activity.comments.length).toBeGreaterThan(0);

    const overviewResponse = await session.agent.get("/api/dashboard/overview");

    expect(overviewResponse.status).toBe(200);
    expect(overviewResponse.body.data.overview.summary.tasks.active).toBeGreaterThanOrEqual(1);
    expect(overviewResponse.body.data.overview.focusItems.length).toBeGreaterThan(0);
    expect(
      overviewResponse.body.data.overview.workQueue.some(
        (item: { taskCode: string }) =>
          item.taskCode === "TASK-INTEGRATION-DASHBOARD"
      )
    ).toBe(true);
    expect(overviewResponse.body.data.overview.workload.length).toBeGreaterThan(0);
    expect(
      overviewResponse.body.data.overview.recentRequests.some(
        (item: { requestCode: string }) =>
          item.requestCode === "REQ-INTEGRATION-DASHBOARD"
      )
    ).toBe(true);
    expect(overviewResponse.body.data.overview.recentActivity.length).toBeGreaterThan(0);
  });

  it("lets admins lower completed task progress and permanently delete tasks", async () => {
    const manager = await UserModel.findOne({
      email: "manager.integration@example.com"
    });
    const employee = await UserModel.findOne({
      email: "employee.integration@example.com"
    });
    const completedTask = await TaskModel.create({
      assignedTo: employee?._id,
      category: "software",
      completedAt: new Date(),
      createdBy: manager?._id,
      priority: "high",
      progress: 100,
      reviewedBy: manager?._id,
      status: "completed",
      taskCode: "TASK-INTEGRATION-ADMIN-PROGRESS",
      title: "Completed progress override test"
    });

    await TaskUpdateModel.create({
      newProgress: 100,
      newStatus: "completed",
      previousProgress: 80,
      previousStatus: "in_progress",
      taskId: completedTask._id,
      updatedBy: manager?._id
    });

    const session = await login(
      "manager.integration@example.com",
      managerPassword
    );
    const progressResponse = await session.agent
      .post(`/api/tasks/${String(completedTask._id)}/progress`)
      .set("x-csrf-token", session.csrfToken)
      .send({ progress: 55 });

    expect(progressResponse.status).toBe(200);
    expect(progressResponse.body.data.task.progress).toBe(55);
    expect(progressResponse.body.data.task.status).toBe("in_progress");
    expect(progressResponse.body.data.task.completedAt).toBeUndefined();
    expect(progressResponse.body.data.task.reviewedBy).toBeUndefined();

    const deleteResponse = await session.agent
      .delete(`/api/tasks/${String(completedTask._id)}`)
      .set("x-csrf-token", session.csrfToken);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data.deletedTask.id).toBe(String(completedTask._id));
    expect(deleteResponse.body.data.deletedTaskUpdateCount).toBe(2);
    expect(await TaskModel.findById(completedTask._id)).toBeNull();
    expect(await TaskUpdateModel.countDocuments({ taskId: completedTask._id })).toBe(0);
    expect(
      await AuditLogModel.exists({
        action: "delete",
        entityId: completedTask._id,
        entityType: "task"
      })
    ).toBeTruthy();
  });

  it("returns request and task report rows with display references", async () => {
    const manager = await UserModel.findOne({
      email: "manager.integration@example.com"
    });
    const employee = await UserModel.findOne({
      email: "employee.integration@example.com"
    });
    const reportRequest = await ItRequestModel.create({
      assignedTo: employee?._id,
      priority: "high",
      requestCode: "REQ-INTEGRATION-REPORT",
      requestedBy: manager?._id,
      status: "assigned",
      title: "Report integration request",
      type: "server"
    });

    await TaskModel.create({
      assignedTo: employee?._id,
      category: "server",
      createdBy: manager?._id,
      priority: "high",
      progress: 10,
      requestId: reportRequest._id,
      status: "open",
      taskCode: "TASK-INTEGRATION-REPORT",
      title: "Report integration task"
    });

    const session = await login(
      "manager.integration@example.com",
      managerPassword
    );
    const requestReportResponse = await session.agent.get(
      "/api/reports/requests?search=REQ-INTEGRATION-REPORT"
    );

    expect(requestReportResponse.status).toBe(200);
    expect(requestReportResponse.body.data[0].requestCode).toBe(
      "REQ-INTEGRATION-REPORT"
    );
    expect(requestReportResponse.body.data[0].assignedTo.fullName).toBe(
      "Integration Employee"
    );

    const taskReportResponse = await session.agent.get(
      "/api/reports/tasks?search=TASK-INTEGRATION-REPORT"
    );

    expect(taskReportResponse.status).toBe(200);
    expect(taskReportResponse.body.data[0].taskCode).toBe(
      "TASK-INTEGRATION-REPORT"
    );
    expect(taskReportResponse.body.data[0].request.requestCode).toBe(
      "REQ-INTEGRATION-REPORT"
    );
  });

  it("creates and lists MongoDB-backed sprints", async () => {
    const manager = await UserModel.findOne({
      email: "manager.integration@example.com"
    });
    const employee = await UserModel.findOne({
      email: "employee.integration@example.com"
    });

    if (!manager || !employee) {
      throw new Error("Required integration-test users were not found.");
    }

    const session = await login(
      "manager.integration@example.com",
      managerPassword
    );
    const createResponse = await session.agent
      .post("/api/sprints")
      .set("x-csrf-token", session.csrfToken)
      .send({
        active: true,
        code: "DEV-INTEGRATION-SPRINT",
        description: "Integration sprint write test",
        name: "Integration Development Sprint",
        notifyLater: false,
        ownerId: String(employee._id),
        progressTarget: 45,
        sprintArea: "development",
        startDate: "2026-07-01T09:00:00.000Z",
        status: "planned",
        targetDate: "2026-07-20T09:00:00.000Z"
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.sprint.code).toBe("DEV-INTEGRATION-SPRINT");
    expect(createResponse.body.data.sprint.status).toBe("in_progress");
    expect(createResponse.body.data.sprint.owner.fullName).toBe(
      "Integration Employee"
    );

    const persisted = await SprintModel.findOne({
      code: "DEV-INTEGRATION-SPRINT"
    });
    expect(persisted?.name).toBe("Integration Development Sprint");

    const listResponse = await session.agent.get(
      "/api/sprints?search=DEV-INTEGRATION-SPRINT"
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data[0].code).toBe("DEV-INTEGRATION-SPRINT");
    expect(listResponse.body.data[0].owner.fullName).toBe(
      "Integration Employee"
    );

    const viewerSession = await login(
      "viewer.integration@example.com",
      viewerPassword
    );
    const employeeListResponse = await viewerSession.agent.get(
      "/api/sprints?search=DEV-INTEGRATION-SPRINT"
    );

    expect(employeeListResponse.status).toBe(200);
    expect(employeeListResponse.body.data[0].code).toBe(
      "DEV-INTEGRATION-SPRINT"
    );
    expect(employeeListResponse.body.data[0].owner.fullName).toBe(
      "Integration Employee"
    );
  });

  it("prevents closing a request that has active linked tasks", async () => {
    const manager = await UserModel.findOne({
      email: "manager.integration@example.com"
    });
    const employee = await UserModel.findOne({
      email: "employee.integration@example.com"
    });
    const linkedRequest = await ItRequestModel.create({
      assignedTo: manager?._id,
      priority: "high",
      requestCode: "REQ-INTEGRATION-ACTIVE",
      requestedBy: manager?._id,
      status: "assigned",
      title: "Request with active work",
      type: "server"
    });

    await TaskModel.create({
      assignedTo: employee?._id,
      category: "server",
      createdBy: manager?._id,
      priority: "high",
      progress: 40,
      requestId: linkedRequest._id,
      status: "in_progress",
      taskCode: "TASK-INTEGRATION-ACTIVE",
      title: "Active linked task"
    });

    const session = await login(
      "manager.integration@example.com",
      managerPassword
    );
    const response = await session.agent
      .patch(`/api/requests/${String(linkedRequest._id)}/status`)
      .set("x-csrf-token", session.csrfToken)
      .send({ status: "closed" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("request_has_active_tasks");
  });

  it("rolls back a business change when its audit write fails", async () => {
    const manager = await UserModel.findOne({
      email: "manager.integration@example.com"
    });
    const existingRequest = await ItRequestModel.create({
      assignedTo: manager?._id,
      priority: "medium",
      requestCode: "REQ-INTEGRATION-ROLLBACK",
      requestedBy: manager?._id,
      status: "assigned",
      title: "Original title",
      type: "support"
    });
    const session = await login(
      "manager.integration@example.com",
      managerPassword
    );
    const auditSpy = vi
      .spyOn(AuditLogModel, "create")
      .mockRejectedValueOnce(new Error("simulated audit failure") as never);

    const response = await session.agent
      .patch(`/api/requests/${String(existingRequest._id)}`)
      .set("x-csrf-token", session.csrfToken)
      .send({ title: "Title that must roll back" });

    expect(response.status).toBe(500);
    const reloaded = await ItRequestModel.findById(existingRequest._id);
    expect(reloaded?.title).toBe("Original title");
    auditSpy.mockRestore();
  });

  it("rejects stale concurrent document saves", async () => {
    const manager = await UserModel.findOne({
      email: "manager.integration@example.com"
    });
    const requestDocument = await ItRequestModel.create({
      assignedTo: manager?._id,
      priority: "low",
      requestCode: "REQ-INTEGRATION-CONCURRENCY",
      requestedBy: manager?._id,
      status: "assigned",
      title: "Concurrency test",
      type: "support"
    });
    const first = await ItRequestModel.findById(requestDocument._id);
    const stale = await ItRequestModel.findById(requestDocument._id);

    if (!first || !stale) {
      throw new Error("Concurrency test request was not found.");
    }

    first.title = "First update";
    await first.save();
    stale.title = "Stale update";

    await expect(stale.save()).rejects.toMatchObject({ name: "VersionError" });
  });

  it("grants supervisors request status permission", async () => {
    const supervisorRole = await RoleModel.findOne({ name: "supervisor" });
    const permission = await PermissionModel.exists({
      name: "requests:change_status",
      roleId: supervisorRole?._id
    });

    expect(permission).toBeTruthy();
  });
});
