export const ROLE_KEYS = [
  "super_admin",
  "it_manager",
  "supervisor",
  "employee"
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_DISPLAY_NAMES: Record<RoleKey, string> = {
  employee: "Employee",
  it_manager: "IT Manager",
  supervisor: "Supervisor",
  super_admin: "Super Admin"
};
