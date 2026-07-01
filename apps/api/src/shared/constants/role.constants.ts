export const ROLE_KEYS = [
  "super_admin",
  "it_manager",
  "supervisor",
  "management_committee",
  "employee"
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_DISPLAY_NAMES: Record<RoleKey, string> = {
  employee: "Employee",
  it_manager: "IT Manager",
  management_committee: "Management Committee",
  supervisor: "Supervisor",
  super_admin: "Super Admin"
};
