import { z } from "zod";
import type { Types } from "mongoose";

import { env } from "../../config/env";
import { AuditLogModel } from "../../modules/audit-logs/audit-log.model";
import { CommentModel } from "../../modules/comments/comment.model";
import { ItRequestModel } from "../../modules/it-requests/request.model";
import { RoleModel } from "../../modules/roles/role.model";
import { TaskModel } from "../../modules/tasks/task.model";
import { TaskUpdateModel } from "../../modules/task-updates/task-update.model";
import { UserModel } from "../../modules/users/user.model";
import { hashPassword } from "../../shared/auth/passwords";

import {
  createDevelopmentDataSeeds,
  type DevelopmentPasswordEnvKey
} from "./development-data.seed";

const developmentPasswordSchema = z.object({
  DEVELOPMENT_EMPLOYEE_PASSWORD: z.string().min(12),
  DEVELOPMENT_IT_MANAGER_PASSWORD: z.string().min(12),
  DEVELOPMENT_SUPERVISOR_PASSWORD: z.string().min(12)
});

export interface DevelopmentSeedResult {
  auditLogsCreated: number;
  commentsCreated: number;
  requestsCreated: number;
  superAdminsPrepared: number;
  taskUpdatesCreated: number;
  tasksCreated: number;
  usersCreated: number;
}

export async function seedDevelopmentData(): Promise<DevelopmentSeedResult> {
  if (env.NODE_ENV === "production") {
    throw new Error("Development data seeding is disabled in production.");
  }

  const passwords = developmentPasswordSchema.parse(process.env);
  const seeds = createDevelopmentDataSeeds();
  const roles = await RoleModel.find({
    name: { $in: ["super_admin", "it_manager", "supervisor", "employee"] }
  });
  const rolesByName = new Map(roles.map((role) => [role.name, role]));

  for (const requiredRole of ["super_admin", "it_manager", "supervisor", "employee"] as const) {
    if (!rolesByName.has(requiredRole)) {
      throw new Error(`Required role is missing: ${requiredRole}`);
    }
  }

  const superAdminRole = rolesByName.get("super_admin");
  const superAdmin = await UserModel.findOne({
    roleId: superAdminRole?._id,
    status: "active"
  }).sort({ createdAt: 1 });

  if (!superAdmin) {
    throw new Error("An active Super Admin is required before seeding development data.");
  }

  const result: DevelopmentSeedResult = {
    auditLogsCreated: 0,
    commentsCreated: 0,
    requestsCreated: 0,
    superAdminsPrepared: 0,
    taskUpdatesCreated: 0,
    tasksCreated: 0,
    usersCreated: 0
  };

  if (
    superAdmin.mustChangePassword ||
    superAdmin.failedLoginCount > 0 ||
    superAdmin.lockedUntil
  ) {
    superAdmin.set({
      failedLoginCount: 0,
      mustChangePassword: false
    });
    superAdmin.set("lockedUntil", undefined);
    await superAdmin.save();
    result.superAdminsPrepared += 1;
  }

  const usersByEmail = new Map<string, Awaited<ReturnType<typeof UserModel.findOne>>>();

  for (const userSeed of seeds.users) {
    const role = rolesByName.get(userSeed.role);
    if (!role) {
      throw new Error(`Role not found for development user: ${userSeed.role}`);
    }

    let user = await UserModel.findOne({ email: userSeed.email });
    if (!user) {
      const passwordHash = await hashPassword(
        passwords[userSeed.passwordEnvKey as DevelopmentPasswordEnvKey]
      );
      user = await UserModel.create({
        department: userSeed.department,
        email: userSeed.email,
        failedLoginCount: 0,
        fullName: userSeed.fullName,
        jobTitle: userSeed.jobTitle,
        ...(userSeed.lastLoginAt ? { lastLoginAt: userSeed.lastLoginAt } : {}),
        mustChangePassword: false,
        passwordHash,
        phone: userSeed.phone,
        roleId: role._id,
        sessionVersion: 0,
        status: userSeed.status ?? "active"
      });
      result.usersCreated += 1;
    } else {
      user.set({
        department: userSeed.department,
        failedLoginCount: 0,
        fullName: userSeed.fullName,
        jobTitle: userSeed.jobTitle,
        ...(userSeed.lastLoginAt ? { lastLoginAt: userSeed.lastLoginAt } : {}),
        mustChangePassword: false,
        phone: userSeed.phone,
        roleId: role._id,
        status: userSeed.status ?? "active"
      });
      await user.save();
    }
    usersByEmail.set(userSeed.email, user);
  }

  const getUser = (email: string) => {
    const user = usersByEmail.get(email);
    if (!user) {
      throw new Error(`Development user not found: ${email}`);
    }
    return user;
  };

  const requestsByCode = new Map<string, Awaited<ReturnType<typeof ItRequestModel.findOne>>>();
  for (const requestSeed of seeds.requests) {
    const values = {
      ...(requestSeed.assignedToEmail
        ? { assignedTo: getUser(requestSeed.assignedToEmail)._id }
        : {}),
      ...(requestSeed.closedAt ? { closedAt: requestSeed.closedAt } : {}),
      description: requestSeed.description,
      priority: requestSeed.priority,
      requestedBy: getUser(requestSeed.requestedByEmail)._id,
      requestedForDepartment: requestSeed.requestedForDepartment,
      requiredDate: requestSeed.requiredDate,
      status: requestSeed.status,
      title: requestSeed.title,
      type: requestSeed.type
    };
    let request = await ItRequestModel.findOne({ requestCode: requestSeed.requestCode });
    if (!request) {
      request = await ItRequestModel.create({
        ...values,
        createdAt: requestSeed.createdAt,
        requestCode: requestSeed.requestCode
      });
      result.requestsCreated += 1;
    } else {
      request.set(values);
      await request.save();
    }
    requestsByCode.set(requestSeed.requestCode, request);
  }

  const getRequest = (requestCode: string) => {
    const request = requestsByCode.get(requestCode);
    if (!request) {
      throw new Error(`Development request not found: ${requestCode}`);
    }
    return request;
  };

  const tasksByCode = new Map<string, Awaited<ReturnType<typeof TaskModel.findOne>>>();
  for (const taskSeed of seeds.tasks) {
    const values = {
      ...(taskSeed.assignedToEmail
        ? { assignedTo: getUser(taskSeed.assignedToEmail)._id }
        : {}),
      ...(taskSeed.blockedReason ? { blockedReason: taskSeed.blockedReason } : {}),
      category: taskSeed.category,
      ...(taskSeed.completedAt ? { completedAt: taskSeed.completedAt } : {}),
      createdBy: getUser(taskSeed.createdByEmail)._id,
      description: taskSeed.description,
      dueDate: taskSeed.dueDate,
      ...(taskSeed.lastProgressUpdateAt
        ? { lastProgressUpdateAt: taskSeed.lastProgressUpdateAt }
        : {}),
      priority: taskSeed.priority,
      progress: taskSeed.progress,
      ...(taskSeed.requestCode
        ? { requestId: getRequest(taskSeed.requestCode)._id }
        : {}),
      ...(taskSeed.reviewedByEmail
        ? { reviewedBy: getUser(taskSeed.reviewedByEmail)._id }
        : {}),
      ...(taskSeed.startDate ? { startDate: taskSeed.startDate } : {}),
      status: taskSeed.status,
      title: taskSeed.title
    };
    let task = await TaskModel.findOne({ taskCode: taskSeed.taskCode });
    if (!task) {
      task = await TaskModel.create({
        ...values,
        createdAt: taskSeed.createdAt,
        taskCode: taskSeed.taskCode
      });
      result.tasksCreated += 1;
    } else {
      task.set(values);
      await task.save();
    }
    tasksByCode.set(taskSeed.taskCode, task);
  }

  const getTask = (taskCode: string) => {
    const task = tasksByCode.get(taskCode);
    if (!task) {
      throw new Error(`Development task not found: ${taskCode}`);
    }
    return task;
  };

  for (const updateSeed of seeds.taskUpdates) {
    const existing = await TaskUpdateModel.exists({
      note: updateSeed.note,
      taskId: getTask(updateSeed.taskCode)._id
    });
    if (!existing) {
      await TaskUpdateModel.create({
        createdAt: updateSeed.createdAt,
        ...(updateSeed.newProgress === undefined
          ? {}
          : { newProgress: updateSeed.newProgress }),
        ...(updateSeed.newStatus ? { newStatus: updateSeed.newStatus } : {}),
        note: updateSeed.note,
        ...(updateSeed.previousProgress === undefined
          ? {}
          : { previousProgress: updateSeed.previousProgress }),
        ...(updateSeed.previousStatus
          ? { previousStatus: updateSeed.previousStatus }
          : {}),
        taskId: getTask(updateSeed.taskCode)._id,
        updatedBy: getUser(updateSeed.updatedByEmail)._id
      });
      result.taskUpdatesCreated += 1;
    }
  }

  const seededComments: Array<{
    actorId: Types.ObjectId;
    id: Types.ObjectId;
    seedKey: string;
  }> = [];
  for (const commentSeed of seeds.comments) {
    const request = getRequest(commentSeed.requestCode);
    let comment = await CommentModel.findOne({
      body: commentSeed.body,
      requestId: request._id
    });
    if (!comment) {
      comment = await CommentModel.create({
        body: commentSeed.body,
        createdAt: commentSeed.createdAt,
        createdBy: getUser(commentSeed.createdByEmail)._id,
        isInternal: commentSeed.isInternal,
        requestId: request._id
      });
      result.commentsCreated += 1;
    }
    seededComments.push({
      actorId: getUser(commentSeed.createdByEmail)._id,
      id: comment._id,
      seedKey: `${commentSeed.requestCode}:${commentSeed.body}`
    });
  }

  const auditSeeds = [
    ...seeds.users.map((seed) => ({
      action: "create" as const,
      actorId: superAdmin._id,
      entityId: getUser(seed.email)._id,
      entityType: "user" as const,
      seedKey: `user:${seed.email}`,
      summary: { email: seed.email, role: seed.role }
    })),
    ...seeds.requests.map((seed) => ({
      action: "create" as const,
      actorId: getUser(seed.requestedByEmail)._id,
      entityId: getRequest(seed.requestCode)._id,
      entityType: "request" as const,
      seedKey: `request:${seed.requestCode}`,
      summary: { requestCode: seed.requestCode, status: seed.status }
    })),
    ...seeds.tasks.map((seed) => ({
      action: "create" as const,
      actorId: getUser(seed.createdByEmail)._id,
      entityId: getTask(seed.taskCode)._id,
      entityType: "task" as const,
      seedKey: `task:${seed.taskCode}`,
      summary: { status: seed.status, taskCode: seed.taskCode }
    })),
    ...seededComments.map((seed) => ({
      action: "comment" as const,
      actorId: seed.actorId,
      entityId: seed.id,
      entityType: "comment" as const,
      seedKey: `comment:${seed.seedKey}`,
      summary: { seeded: true }
    }))
  ];

  for (const auditSeed of auditSeeds) {
    const existing = await AuditLogModel.exists({
      "newValue.seedKey": auditSeed.seedKey,
      userAgent: "itdcc-development-seed/v1"
    });
    if (!existing) {
      await AuditLogModel.create({
        action: auditSeed.action,
        actorId: auditSeed.actorId,
        entityId: auditSeed.entityId,
        entityType: auditSeed.entityType,
        newValue: {
          ...auditSeed.summary,
          seedKey: auditSeed.seedKey
        },
        userAgent: "itdcc-development-seed/v1"
      });
      result.auditLogsCreated += 1;
    }
  }

  return result;
}
