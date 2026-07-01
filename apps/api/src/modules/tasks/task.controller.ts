import type { RequestHandler } from "express";

import { getAuditRequestContext } from "../../shared/audit/audit.types";
import { getAuthUser } from "../../shared/auth/auth-access";
import { ok, paginatedOk } from "../../shared/http/api-response";
import { asyncHandler } from "../../shared/http/async-handler";
import { getValidated } from "../../shared/validation/validate-request";

import {
  changeTaskStatus,
  createTask,
  deleteTask,
  getTaskByIdForActor,
  listTaskUpdates,
  listTasks,
  reassignTask,
  updateTask,
  updateTaskProgress
} from "./task.service";
import type {
  ChangeTaskStatusBody,
  CreateTaskBody,
  ReassignTaskBody,
  TaskIdParams,
  TaskListQuery,
  TaskUpdateListQuery,
  UpdateTaskBody,
  UpdateTaskProgressBody
} from "./task.validation";

export const listTasksController: RequestHandler = asyncHandler(
  async (req, res) => {
    const query = getValidated<TaskListQuery>(res, "query");
    const result = await listTasks(query, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);

export const createTaskController: RequestHandler = asyncHandler(
  async (req, res) => {
    const body = getValidated<CreateTaskBody>(res, "body");
    const task = await createTask(body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(201).json(ok({ task }));
  }
);

export const getTaskController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<TaskIdParams>(res, "params");
    const task = await getTaskByIdForActor(params.id, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ task }));
  }
);

export const deleteTaskController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<TaskIdParams>(res, "params");
    const result = await deleteTask(params.id, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok(result));
  }
);

export const updateTaskController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<TaskIdParams>(res, "params");
    const body = getValidated<UpdateTaskBody>(res, "body");
    const task = await updateTask(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ task }));
  }
);

export const changeTaskStatusController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<TaskIdParams>(res, "params");
    const body = getValidated<ChangeTaskStatusBody>(res, "body");
    const task = await changeTaskStatus(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ task }));
  }
);

export const updateTaskProgressController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<TaskIdParams>(res, "params");
    const body = getValidated<UpdateTaskProgressBody>(res, "body");
    const task = await updateTaskProgress(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ task }));
  }
);

export const reassignTaskController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<TaskIdParams>(res, "params");
    const body = getValidated<ReassignTaskBody>(res, "body");
    const task = await reassignTask(params.id, body, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(ok({ task }));
  }
);

export const listTaskUpdatesController: RequestHandler = asyncHandler(
  async (req, res) => {
    const params = getValidated<TaskIdParams>(res, "params");
    const query = getValidated<TaskUpdateListQuery>(res, "query");
    const result = await listTaskUpdates(params.id, query, {
      actor: getAuthUser(res),
      auditContext: getAuditRequestContext(req)
    });

    res.status(200).json(paginatedOk(result.data, result.pagination));
  }
);
