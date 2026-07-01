import { z } from "zod";

import { PRIORITIES } from "../../shared/constants/request.constants";
import {
  TASK_CATEGORIES,
  TASK_STATUSES
} from "../../shared/constants/task.constants";
import {
  enumSchema,
  mongoObjectIdSchema,
  nonEmptyStringSchema,
  optionalTrimmedStringSchema
} from "../../shared/validation/common-schemas";
import { baseListQuerySchema } from "../../shared/validation/list-query-schemas";

const taskBodyHasUpdate = (value: Record<string, unknown>): boolean =>
  Object.values(value).some((fieldValue) => fieldValue !== undefined);

const optionalBooleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

const progressSchema = z.coerce.number().int().min(0).max(100);
const taskModuleSchema = optionalTrimmedStringSchema.refine(
  (value) => value === undefined || value.length <= 120,
  "Module values must be 120 characters or fewer"
);

export const taskIdParamsSchema = z.object({
  id: mongoObjectIdSchema
});

export const taskListQuerySchema = baseListQuerySchema
  .safeExtend({
    assignedTo: mongoObjectIdSchema.optional(),
    category: enumSchema(TASK_CATEGORIES).optional(),
    createdBy: mongoObjectIdSchema.optional(),
    dueDateFrom: z.string().datetime().optional(),
    dueDateTo: z.string().datetime().optional(),
    mainModule: taskModuleSchema,
    overdue: optionalBooleanQuerySchema,
    priority: enumSchema(PRIORITIES).optional(),
    requestId: mongoObjectIdSchema.optional(),
    status: enumSchema(TASK_STATUSES).optional(),
    subModule: taskModuleSchema
  })
  .refine(
    (value) => {
      if (!value.dueDateFrom || !value.dueDateTo) {
        return true;
      }

      return Date.parse(value.dueDateFrom) <= Date.parse(value.dueDateTo);
    },
    {
      message: "`dueDateFrom` must be before or equal to `dueDateTo`",
      path: ["dueDateFrom"]
    }
  );

export const taskUpdateListQuerySchema = baseListQuerySchema;

export const createTaskBodySchema = z
  .object({
    assigneeIds: z.array(mongoObjectIdSchema).optional(),
    assignedTo: mongoObjectIdSchema.optional(),
    category: enumSchema(TASK_CATEGORIES).default("support"),
    description: optionalTrimmedStringSchema,
    dueDate: z.string().datetime().optional(),
    mainModule: taskModuleSchema,
    priority: enumSchema(PRIORITIES).default("medium"),
    requestId: mongoObjectIdSchema.optional(),
    startDate: z.string().datetime().optional(),
    subModule: taskModuleSchema,
    title: nonEmptyStringSchema
  })
  .strict();

export const updateTaskBodySchema = z
  .object({
    category: enumSchema(TASK_CATEGORIES).optional(),
    description: optionalTrimmedStringSchema,
    dueDate: z.string().datetime().nullable().optional(),
    mainModule: taskModuleSchema,
    priority: enumSchema(PRIORITIES).optional(),
    startDate: z.string().datetime().nullable().optional(),
    subModule: taskModuleSchema,
    title: nonEmptyStringSchema.optional()
  })
  .strict()
  .refine(taskBodyHasUpdate, "At least one field must be provided");

export const changeTaskStatusBodySchema = z
  .object({
    blockedReason: optionalTrimmedStringSchema,
    note: optionalTrimmedStringSchema,
    status: enumSchema(TASK_STATUSES)
  })
  .strict();

export const updateTaskProgressBodySchema = z
  .object({
    note: optionalTrimmedStringSchema,
    progress: progressSchema
  })
  .strict();

export const reassignTaskBodySchema = z
  .object({
    assigneeIds: z.array(mongoObjectIdSchema).optional(),
    assignedTo: mongoObjectIdSchema.nullable().optional()
  })
  .strict();

export type ChangeTaskStatusBody = z.infer<typeof changeTaskStatusBodySchema>;
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type ReassignTaskBody = z.infer<typeof reassignTaskBodySchema>;
export type TaskIdParams = z.infer<typeof taskIdParamsSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export type TaskUpdateListQuery = z.infer<typeof taskUpdateListQuerySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type UpdateTaskProgressBody = z.infer<
  typeof updateTaskProgressBodySchema
>;
