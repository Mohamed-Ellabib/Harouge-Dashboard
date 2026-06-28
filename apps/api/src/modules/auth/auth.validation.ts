import { z } from "zod";

import { MIN_PASSWORD_LENGTH } from "../../shared/auth/passwords";

export const loginBodySchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required")
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `New password must be at least ${MIN_PASSWORD_LENGTH} characters`
    )
    .max(128, "New password must not exceed 128 characters")
});

export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
