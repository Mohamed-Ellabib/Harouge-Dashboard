import { env } from "../../config/env";

export const AUTH_POLICY = Object.freeze({
  forcePasswordChangeOnFirstLogin: env.FORCE_PASSWORD_CHANGE_ON_FIRST_LOGIN,
  lockMinutes: env.AUTH_LOCK_MINUTES,
  maxFailedLoginAttempts: env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS,
  sessionTtlHours: env.SESSION_TTL_HOURS
});
