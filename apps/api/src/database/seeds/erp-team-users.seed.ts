import { z } from "zod";

import type { RoleKey } from "../../shared/constants/role.constants";

export type ErpTeamUserSeed = {
  department: string;
  email: string;
  fullName: string;
  jobTitle: string;
  notes: string;
  passwordKey: keyof ErpTeamSeedPasswords;
  role: Extract<RoleKey, "employee" | "it_manager" | "supervisor">;
};

export type ErpTeamSeedPasswords = {
  employee: string;
  it_manager: string;
  supervisor: string;
};

const rawPasswordEnvSchema = z.object({
  DEVELOPMENT_EMPLOYEE_PASSWORD: z.string().min(12).optional(),
  DEVELOPMENT_IT_MANAGER_PASSWORD: z.string().min(12).optional(),
  DEVELOPMENT_SUPERVISOR_PASSWORD: z.string().min(12).optional(),
  ERP_TEAM_EMPLOYEE_INITIAL_PASSWORD: z.string().min(12).optional(),
  ERP_TEAM_INITIAL_PASSWORD: z.string().min(12).optional(),
  ERP_TEAM_IT_MANAGER_INITIAL_PASSWORD: z.string().min(12).optional(),
  ERP_TEAM_SUPERVISOR_INITIAL_PASSWORD: z.string().min(12).optional()
});

export const erpTeamUserSeeds: ErpTeamUserSeed[] = [
  {
    department: "ERP Project Team",
    email: "zied.hasni@harouge.com",
    fullName: "Zied Hasni",
    jobTitle: "Project Manager",
    notes: "ERP system development team.",
    passwordKey: "supervisor",
    role: "supervisor"
  },
  {
    department: "ERP Project Team",
    email: "boshra.mankousa@harouge.com",
    fullName: "Boshra Mankousa",
    jobTitle: "ERP Team Member",
    notes: "ERP system development team.",
    passwordKey: "employee",
    role: "employee"
  },
  {
    department: "ERP Project Team",
    email: "maha.sassi@harouge.com",
    fullName: "Maha Sassi",
    jobTitle: "ERP Team Member",
    notes: "ERP system development team.",
    passwordKey: "employee",
    role: "employee"
  },
  {
    department: "ERP Project Team",
    email: "abdulgadir.alzubaidi@harouge.com",
    fullName: "ABDULGADIR ALZUBAIDI",
    jobTitle: "ERP Team Member",
    notes: "ERP system development team.",
    passwordKey: "employee",
    role: "employee"
  },
  {
    department: "ERP Project Team",
    email: "mohamed.ellabib@harouge.com",
    fullName: "Mohamed Ellabib",
    jobTitle: "ERP Team Member",
    notes: "ERP system development team.",
    passwordKey: "employee",
    role: "employee"
  },
  {
    department: "ERP Project Team",
    email: "elham.jubran@harouge.com",
    fullName: "Elham Jubran",
    jobTitle: "ERP Team Member",
    notes: "ERP system development team.",
    passwordKey: "employee",
    role: "employee"
  },
  {
    department: "ERP Project Team",
    email: "amer.ghbeini@harouge.com",
    fullName: "Amer Ghbeini",
    jobTitle: "IT Manager",
    notes: "ERP system development team.",
    passwordKey: "it_manager",
    role: "it_manager"
  }
];

export function readErpTeamSeedPasswords(
  env: NodeJS.ProcessEnv
): ErpTeamSeedPasswords {
  const raw = rawPasswordEnvSchema.parse(env);
  const fallback = raw.ERP_TEAM_INITIAL_PASSWORD;
  const passwords = {
    employee:
      raw.ERP_TEAM_EMPLOYEE_INITIAL_PASSWORD ??
      fallback ??
      raw.DEVELOPMENT_EMPLOYEE_PASSWORD,
    it_manager:
      raw.ERP_TEAM_IT_MANAGER_INITIAL_PASSWORD ??
      fallback ??
      raw.DEVELOPMENT_IT_MANAGER_PASSWORD,
    supervisor:
      raw.ERP_TEAM_SUPERVISOR_INITIAL_PASSWORD ??
      fallback ??
      raw.DEVELOPMENT_SUPERVISOR_PASSWORD
  };

  const missing = Object.entries(passwords)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing ERP team seed password for: ${missing.join(", ")}. Set ERP_TEAM_INITIAL_PASSWORD or role-specific ERP_TEAM_*_INITIAL_PASSWORD values.`
    );
  }

  return passwords as ErpTeamSeedPasswords;
}
