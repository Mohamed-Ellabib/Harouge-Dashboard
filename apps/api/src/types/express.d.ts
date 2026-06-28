import type { AuthenticatedUserContext } from "../shared/auth/auth-context";
import type { ValidatedRequestData } from "../shared/validation/validate-request";

declare global {
  namespace Express {
    interface Locals {
      authUser?: AuthenticatedUserContext;
      requestId?: string;
      validated?: ValidatedRequestData;
    }
  }
}

export {};
