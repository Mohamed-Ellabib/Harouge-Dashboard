import type { Session } from "../api/client";

export function resolvePostLoginRoute(session: Session) {
  if (session.roleCode === "employee") {
    return "/my-tasks";
  }

  if (
    session.roleCode === "it_manager" ||
    session.roleCode === "management_committee" ||
    session.roleCode === "supervisor"
  ) {
    return "/management-dashboard";
  }

  return "/dashboard";
}
