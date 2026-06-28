import { z } from "zod";

import { AuditLogModel } from "../modules/audit-logs/audit-log.model";
import { CommentModel } from "../modules/comments/comment.model";
import { ItRequestModel } from "../modules/it-requests/request.model";
import { SprintModel } from "../modules/sprints/sprint.model";
import { TaskUpdateModel } from "../modules/task-updates/task-update.model";
import { TaskModel } from "../modules/tasks/task.model";
import { UserModel } from "../modules/users/user.model";
import { logger } from "../shared/logger/logger";

import { connectDatabase, disconnectDatabase } from "./mongoose";

const cleanupConfigSchema = z.object({
  INITIAL_ADMIN_EMAIL: z.email().default("admin@harouge.com")
});

async function cleanDemoData(): Promise<void> {
  const config = cleanupConfigSchema.parse(process.env);
  const adminEmail = config.INITIAL_ADMIN_EMAIL.toLowerCase();

  await connectDatabase();

  const admin = await UserModel.findOne({ email: adminEmail });

  if (!admin) {
    throw new Error(`Cannot clean demo data because ${adminEmail} was not found.`);
  }

  const nonAdminUsers = await UserModel.find({ _id: { $ne: admin._id } }).select("_id email");
  const nonAdminUserIds = nonAdminUsers.map((user) => user._id);
  const before = {
    auditLogs: await AuditLogModel.countDocuments(),
    comments: await CommentModel.countDocuments(),
    requests: await ItRequestModel.countDocuments(),
    sprints: await SprintModel.countDocuments(),
    taskUpdates: await TaskUpdateModel.countDocuments(),
    tasks: await TaskModel.countDocuments(),
    users: await UserModel.countDocuments()
  };

  const [
    comments,
    taskUpdates,
    tasks,
    requests,
    sprints,
    auditLogs,
    users
  ] = await Promise.all([
    CommentModel.deleteMany({}),
    TaskUpdateModel.deleteMany({}),
    TaskModel.deleteMany({}),
    ItRequestModel.deleteMany({}),
    SprintModel.deleteMany({}),
    AuditLogModel.deleteMany({
      $or: [
        { "newValue.seedKey": { $exists: true } },
        { actorId: { $in: nonAdminUserIds } },
        { entityId: { $in: nonAdminUserIds }, entityType: "user" }
      ]
    }),
    UserModel.deleteMany({ _id: { $ne: admin._id } })
  ]);

  const after = {
    auditLogs: await AuditLogModel.countDocuments(),
    comments: await CommentModel.countDocuments(),
    requests: await ItRequestModel.countDocuments(),
    sprints: await SprintModel.countDocuments(),
    taskUpdates: await TaskUpdateModel.countDocuments(),
    tasks: await TaskModel.countDocuments(),
    users: await UserModel.countDocuments()
  };

  logger.info(
    {
      after,
      before,
      deleted: {
        auditLogs: auditLogs.deletedCount,
        comments: comments.deletedCount,
        requests: requests.deletedCount,
        sprints: sprints.deletedCount,
        taskUpdates: taskUpdates.deletedCount,
        tasks: tasks.deletedCount,
        users: users.deletedCount
      },
      keptAdminEmail: adminEmail
    },
    "Demo data cleanup completed"
  );
}

cleanDemoData()
  .catch((error: unknown) => {
    logger.error({ error }, "Demo data cleanup failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
