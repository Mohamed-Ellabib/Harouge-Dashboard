import {
  ROLE_DISPLAY_NAMES,
  type RoleKey
} from "../../shared/constants/role.constants";

export interface DefaultRoleSeed {
  description: string;
  displayName: string;
  isSystem: boolean;
  name: RoleKey;
}

export const defaultRoleSeeds: readonly DefaultRoleSeed[] = [
  {
    description: "Full system owner with unrestricted administrative access.",
    displayName: ROLE_DISPLAY_NAMES.super_admin,
    isSystem: true,
    name: "super_admin"
  },
  {
    description: "IT department manager responsible for requests, tasks, reviews, and operational visibility.",
    displayName: ROLE_DISPLAY_NAMES.it_manager,
    isSystem: true,
    name: "it_manager"
  },
  {
    description: "Team supervisor responsible for assigned-area work coordination and progress review.",
    displayName: ROLE_DISPLAY_NAMES.supervisor,
    isSystem: true,
    name: "supervisor"
  },
  {
    description: "Read-only management committee account for ERP project progress visibility.",
    displayName: ROLE_DISPLAY_NAMES.management_committee,
    isSystem: true,
    name: "management_committee"
  },
  {
    description: "Department employee with access to assigned work and permitted request context.",
    displayName: ROLE_DISPLAY_NAMES.employee,
    isSystem: true,
    name: "employee"
  }
];
