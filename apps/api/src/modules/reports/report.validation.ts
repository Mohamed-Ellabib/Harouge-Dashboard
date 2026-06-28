import { z } from "zod";

import {
  PRIORITIES,
  REQUEST_STATUSES,
  REQUEST_TYPES
} from "../../shared/constants/request.constants";
import {
  TASK_CATEGORIES,
  TASK_STATUSES
} from "../../shared/constants/task.constants";
import {
  enumSchema,
  mongoObjectIdSchema
} from "../../shared/validation/common-schemas";
import { baseListQuerySchema } from "../../shared/validation/list-query-schemas";

const dateRangeIsOrdered = (
  value: Record<string, unknown>,
  fromKey: string,
  toKey: string
): boolean => {
  const fromValue = value[fromKey];
  const toValue = value[toKey];

  if (typeof fromValue !== "string" || typeof toValue !== "string") {
    return true;
  }

  return Date.parse(fromValue) <= Date.parse(toValue);
};

export const requestReportQuerySchema = baseListQuerySchema
  .extend({
    assignedTo: mongoObjectIdSchema.optional(),
    closedDateFrom: z.string().datetime().optional(),
    closedDateTo: z.string().datetime().optional(),
    priority: enumSchema(PRIORITIES).optional(),
    requestedBy: mongoObjectIdSchema.optional(),
    requiredDateFrom: z.string().datetime().optional(),
    requiredDateTo: z.string().datetime().optional(),
    status: enumSchema(REQUEST_STATUSES).optional(),
    type: enumSchema(REQUEST_TYPES).optional()
  })
  .refine((value) => dateRangeIsOrdered(value, "requiredDateFrom", "requiredDateTo"), {
    message: "`requiredDateFrom` must be before or equal to `requiredDateTo`",
    path: ["requiredDateFrom"]
  })
  .refine((value) => dateRangeIsOrdered(value, "closedDateFrom", "closedDateTo"), {
    message: "`closedDateFrom` must be before or equal to `closedDateTo`",
    path: ["closedDateFrom"]
  });

export const taskReportQuerySchema = baseListQuerySchema
  .extend({
    assignedTo: mongoObjectIdSchema.optional(),
    category: enumSchema(TASK_CATEGORIES).optional(),
    completedDateFrom: z.string().datetime().optional(),
    completedDateTo: z.string().datetime().optional(),
    createdBy: mongoObjectIdSchema.optional(),
    dueDateFrom: z.string().datetime().optional(),
    dueDateTo: z.string().datetime().optional(),
    overdue: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    priority: enumSchema(PRIORITIES).optional(),
    requestId: mongoObjectIdSchema.optional(),
    reviewedBy: mongoObjectIdSchema.optional(),
    status: enumSchema(TASK_STATUSES).optional()
  })
  .refine((value) => dateRangeIsOrdered(value, "dueDateFrom", "dueDateTo"), {
    message: "`dueDateFrom` must be before or equal to `dueDateTo`",
    path: ["dueDateFrom"]
  })
  .refine(
    (value) =>
      dateRangeIsOrdered(value, "completedDateFrom", "completedDateTo"),
    {
      message: "`completedDateFrom` must be before or equal to `completedDateTo`",
      path: ["completedDateFrom"]
    }
  );

export type RequestReportQuery = z.infer<typeof requestReportQuerySchema>;
export type TaskReportQuery = z.infer<typeof taskReportQuerySchema>;
