import { z } from "zod";

export const dashboardActivityQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(10)
  })
  .strict();

export type DashboardActivityQuery = z.infer<
  typeof dashboardActivityQuerySchema
>;
