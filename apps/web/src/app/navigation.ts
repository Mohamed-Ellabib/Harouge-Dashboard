import type { Session } from "../api/client";

export function resolvePostLoginRoute(session: Session) {
  return session.roleCode === "employee" ? "/my-tasks" : "/dashboard";
}
