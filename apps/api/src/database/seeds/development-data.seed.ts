import type {
  Priority,
  RequestStatus,
  RequestType
} from "../../shared/constants/request.constants";
import type { RoleKey } from "../../shared/constants/role.constants";
import type {
  TaskCategory,
  TaskStatus
} from "../../shared/constants/task.constants";
import type { UserStatus } from "../../shared/constants/user.constants";

export type DevelopmentPasswordEnvKey =
  | "DEVELOPMENT_EMPLOYEE_PASSWORD"
  | "DEVELOPMENT_IT_MANAGER_PASSWORD"
  | "DEVELOPMENT_SUPERVISOR_PASSWORD";

export interface DevelopmentUserSeed {
  department: string;
  email: string;
  fullName: string;
  jobTitle: string;
  lastLoginAt?: Date;
  passwordEnvKey: DevelopmentPasswordEnvKey;
  phone: string;
  role: RoleKey;
  status?: UserStatus;
}

export interface DevelopmentRequestSeed {
  assignedToEmail?: string;
  closedAt?: Date;
  createdAt: Date;
  description: string;
  priority: Priority;
  requestCode: string;
  requestedByEmail: string;
  requestedForDepartment: string;
  requiredDate: Date;
  status: RequestStatus;
  title: string;
  type: RequestType;
}

export interface DevelopmentTaskSeed {
  assignedToEmail?: string;
  blockedReason?: string;
  category: TaskCategory;
  completedAt?: Date;
  createdAt: Date;
  createdByEmail: string;
  description: string;
  dueDate: Date;
  lastProgressUpdateAt?: Date;
  priority: Priority;
  progress: number;
  requestCode?: string;
  reviewedByEmail?: string;
  startDate?: Date;
  status: TaskStatus;
  taskCode: string;
  title: string;
}

export interface DevelopmentTaskUpdateSeed {
  createdAt: Date;
  newProgress?: number;
  newStatus?: TaskStatus;
  note: string;
  previousProgress?: number;
  previousStatus?: TaskStatus;
  taskCode: string;
  updatedByEmail: string;
}

export interface DevelopmentCommentSeed {
  body: string;
  createdAt: Date;
  createdByEmail: string;
  isInternal: boolean;
  requestCode: string;
}

export interface DevelopmentDataSeeds {
  comments: readonly DevelopmentCommentSeed[];
  requests: readonly DevelopmentRequestSeed[];
  taskUpdates: readonly DevelopmentTaskUpdateSeed[];
  tasks: readonly DevelopmentTaskSeed[];
  users: readonly DevelopmentUserSeed[];
}

const managerEmail = "it.manager.demo@example.com";
const supervisorEmail = "it.supervisor.demo@example.com";
const employeeEmail = "it.employee.demo@example.com";

export function createDevelopmentDataSeeds(
  now = new Date()
): DevelopmentDataSeeds {
  const at = (dayOffset: number, hour = 9): Date => {
    const value = new Date(now);
    value.setUTCHours(hour, 0, 0, 0);
    value.setUTCDate(value.getUTCDate() + dayOffset);
    return value;
  };

  const users: readonly DevelopmentUserSeed[] = [
    {
      department: "IT",
      email: managerEmail,
      fullName: "Khaled Mansour",
      jobTitle: "IT Operations Manager",
      lastLoginAt: at(0, 8),
      passwordEnvKey: "DEVELOPMENT_IT_MANAGER_PASSWORD",
      phone: "+218 91 000 0101",
      role: "it_manager"
    },
    {
      department: "IT Infrastructure",
      email: supervisorEmail,
      fullName: "Amina El-Fitouri",
      jobTitle: "Infrastructure Supervisor",
      lastLoginAt: at(-1, 11),
      passwordEnvKey: "DEVELOPMENT_SUPERVISOR_PASSWORD",
      phone: "+218 91 000 0102",
      role: "supervisor"
    },
    {
      department: "IT Support",
      email: employeeEmail,
      fullName: "Youssef Al-Werfalli",
      jobTitle: "IT Support Specialist",
      lastLoginAt: at(0, 7),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0103",
      role: "employee"
    },
    {
      department: "Operations",
      email: "nadia.bensalem@harouge.example",
      fullName: "Nadia Ben Salem",
      jobTitle: "IT Service Delivery Manager",
      lastLoginAt: at(0, 6),
      passwordEnvKey: "DEVELOPMENT_IT_MANAGER_PASSWORD",
      phone: "+218 91 000 0104",
      role: "it_manager"
    },
    {
      department: "Applications",
      email: "omar.alharbi@harouge.example",
      fullName: "Omar Al-Harbi",
      jobTitle: "Applications Manager",
      lastLoginAt: at(-1, 15),
      passwordEnvKey: "DEVELOPMENT_IT_MANAGER_PASSWORD",
      phone: "+218 91 000 0105",
      role: "it_manager"
    },
    {
      department: "Infrastructure",
      email: "leila.faraj@harouge.example",
      fullName: "Leila Faraj",
      jobTitle: "Infrastructure Manager",
      lastLoginAt: at(-2, 10),
      passwordEnvKey: "DEVELOPMENT_IT_MANAGER_PASSWORD",
      phone: "+218 91 000 0106",
      role: "it_manager"
    },
    {
      department: "Network",
      email: "ahmed.khan@harouge.example",
      fullName: "Ahmed Khan",
      jobTitle: "Network Supervisor",
      lastLoginAt: at(0, 9),
      passwordEnvKey: "DEVELOPMENT_SUPERVISOR_PASSWORD",
      phone: "+218 91 000 0107",
      role: "supervisor"
    },
    {
      department: "Service Desk",
      email: "sara.salem@harouge.example",
      fullName: "Sara Salem",
      jobTitle: "Service Desk Supervisor",
      lastLoginAt: at(-1, 9),
      passwordEnvKey: "DEVELOPMENT_SUPERVISOR_PASSWORD",
      phone: "+218 91 000 0108",
      role: "supervisor"
    },
    {
      department: "Systems",
      email: "james.miller@harouge.example",
      fullName: "James Miller",
      jobTitle: "Systems Supervisor",
      lastLoginAt: at(-3, 14),
      passwordEnvKey: "DEVELOPMENT_SUPERVISOR_PASSWORD",
      phone: "+218 91 000 0109",
      role: "supervisor"
    },
    {
      department: "Endpoint Services",
      email: "maria.santos@harouge.example",
      fullName: "Maria Santos",
      jobTitle: "Endpoint Administrator",
      lastLoginAt: at(0, 8),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0110",
      role: "employee"
    },
    {
      department: "Access Management",
      email: "fatima.almansoori@harouge.example",
      fullName: "Fatima Al-Mansoori",
      jobTitle: "Access Control Analyst",
      lastLoginAt: at(-1, 13),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0111",
      role: "employee"
    },
    {
      department: "Field Operations",
      email: "david.johnson@harouge.example",
      fullName: "David Johnson",
      jobTitle: "Field Support Technician",
      lastLoginAt: at(-2, 16),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0112",
      role: "employee"
    },
    {
      department: "Systems",
      email: "michael.chen@harouge.example",
      fullName: "Michael Chen",
      jobTitle: "Systems Analyst",
      lastLoginAt: at(-3, 9),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0113",
      role: "employee"
    },
    {
      department: "Backup Operations",
      email: "liam.brown@harouge.example",
      fullName: "Liam Brown",
      jobTitle: "Backup Administrator",
      lastLoginAt: at(0, 6),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0114",
      role: "employee"
    },
    {
      department: "Network",
      email: "rania.elobeidi@harouge.example",
      fullName: "Rania El-Obeidi",
      jobTitle: "Network Engineer",
      lastLoginAt: at(-1, 10),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0115",
      role: "employee"
    },
    {
      department: "Server Operations",
      email: "tarek.abushagur@harouge.example",
      fullName: "Tarek Abushagur",
      jobTitle: "Server Administrator",
      lastLoginAt: at(-2, 8),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0116",
      role: "employee"
    },
    {
      department: "Service Desk",
      email: "salma.alkilani@harouge.example",
      fullName: "Salma Al-Kilani",
      jobTitle: "Support Coordinator",
      lastLoginAt: at(-4, 12),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0117",
      role: "employee"
    },
    {
      department: "Hardware Services",
      email: "abdulrahman.zlitni@harouge.example",
      fullName: "Abdulrahman Zlitni",
      jobTitle: "Hardware Technician",
      lastLoginAt: at(-5, 11),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0118",
      role: "employee"
    },
    {
      department: "Application Support",
      email: "noor.haddad@harouge.example",
      fullName: "Noor Haddad",
      jobTitle: "Software Support Specialist",
      lastLoginAt: at(-6, 9),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0119",
      role: "employee"
    },
    {
      department: "Monitoring",
      email: "faisal.altumi@harouge.example",
      fullName: "Faisal Al-Tumi",
      jobTitle: "Monitoring Analyst",
      lastLoginAt: at(-7, 15),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0120",
      role: "employee"
    },
    {
      department: "Finance",
      email: "rizal.badayos@harouge.example",
      fullName: "Rizal Badayos",
      jobTitle: "Staff",
      lastLoginAt: at(-10, 12),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0121",
      role: "employee",
      status: "inactive"
    },
    {
      department: "Operations",
      email: "sarah.miller@harouge.example",
      fullName: "Sarah Miller",
      jobTitle: "Technician",
      lastLoginAt: at(-14, 9),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0122",
      role: "employee",
      status: "inactive"
    },
    {
      department: "Administration",
      email: "peter.okoro@harouge.example",
      fullName: "Peter Okoro",
      jobTitle: "Support Technician",
      lastLoginAt: at(-16, 10),
      passwordEnvKey: "DEVELOPMENT_EMPLOYEE_PASSWORD",
      phone: "+218 91 000 0123",
      role: "employee",
      status: "inactive"
    }
  ];

  const requests: readonly DevelopmentRequestSeed[] = [
    {
      assignedToEmail: supervisorEmail,
      createdAt: at(-8),
      description:
        "Prepare and deploy a replacement virtualization host, validate firmware, join it to the management network, and schedule workload migration.",
      priority: "urgent",
      requestCode: "REQ-DEMO-001",
      requestedByEmail: managerEmail,
      requestedForDepartment: "IT Infrastructure",
      requiredDate: at(7),
      status: "in_progress",
      title: "Deploy replacement virtualization host",
      type: "server"
    },
    {
      assignedToEmail: supervisorEmail,
      createdAt: at(-3),
      description:
        "Restore approved VPN access for the field engineering group and verify multi-factor authentication enrollment.",
      priority: "high",
      requestCode: "REQ-DEMO-002",
      requestedByEmail: employeeEmail,
      requestedForDepartment: "Field Engineering",
      requiredDate: at(1),
      status: "assigned",
      title: "Restore field engineering VPN access",
      type: "access"
    },
    {
      assignedToEmail: employeeEmail,
      createdAt: at(-6),
      description:
        "Upgrade endpoint protection agents on Finance workstations and confirm policy synchronization with the management console.",
      priority: "medium",
      requestCode: "REQ-DEMO-003",
      requestedByEmail: managerEmail,
      requestedForDepartment: "Finance",
      requiredDate: at(3),
      status: "in_progress",
      title: "Upgrade Finance endpoint protection",
      type: "software"
    },
    {
      assignedToEmail: employeeEmail,
      createdAt: at(-12),
      description:
        "Identify the source of intermittent latency affecting headquarters users during peak morning hours.",
      priority: "urgent",
      requestCode: "REQ-DEMO-004",
      requestedByEmail: supervisorEmail,
      requestedForDepartment: "Headquarters",
      requiredDate: at(-4),
      status: "completed",
      title: "Investigate headquarters network latency",
      type: "network"
    },
    {
      assignedToEmail: supervisorEmail,
      closedAt: at(-2, 15),
      createdAt: at(-10),
      description:
        "Create the approved application, shared-folder, and email access required for a new Finance analyst.",
      priority: "medium",
      requestCode: "REQ-DEMO-005",
      requestedByEmail: managerEmail,
      requestedForDepartment: "Finance",
      requiredDate: at(-3),
      status: "closed",
      title: "Provision Finance analyst access",
      type: "access"
    },
    {
      assignedToEmail: managerEmail,
      createdAt: at(-5),
      description:
        "Assess a request to deploy an unsupported printer driver package on managed workstations.",
      priority: "low",
      requestCode: "REQ-DEMO-006",
      requestedByEmail: employeeEmail,
      requestedForDepartment: "Administration",
      requiredDate: at(5),
      status: "rejected",
      title: "Review unsupported printer driver request",
      type: "support"
    }
  ];

  const tasks: readonly DevelopmentTaskSeed[] = [
    {
      assignedToEmail: employeeEmail,
      category: "server",
      createdAt: at(-7),
      createdByEmail: supervisorEmail,
      description:
        "Apply the approved firmware baseline, configure management interfaces, and register the host in monitoring.",
      dueDate: at(4),
      lastProgressUpdateAt: at(-1, 14),
      priority: "urgent",
      progress: 45,
      requestCode: "REQ-DEMO-001",
      startDate: at(-5),
      status: "in_progress",
      taskCode: "TASK-DEMO-001",
      title: "Prepare virtualization host baseline"
    },
    {
      assignedToEmail: supervisorEmail,
      blockedReason: "Facilities confirmation for rack power capacity is pending.",
      category: "hardware",
      createdAt: at(-7, 10),
      createdByEmail: managerEmail,
      description:
        "Confirm rack units, redundant power feeds, cooling capacity, and cable paths before installation.",
      dueDate: at(2),
      lastProgressUpdateAt: at(-2, 16),
      priority: "high",
      progress: 30,
      requestCode: "REQ-DEMO-001",
      startDate: at(-6),
      status: "blocked",
      taskCode: "TASK-DEMO-002",
      title: "Validate rack power and cooling readiness"
    },
    {
      assignedToEmail: employeeEmail,
      category: "access",
      createdAt: at(-2),
      createdByEmail: supervisorEmail,
      description:
        "Confirm the approved user list and restore VPN group membership after MFA verification.",
      dueDate: at(1),
      priority: "high",
      progress: 0,
      requestCode: "REQ-DEMO-002",
      status: "open",
      taskCode: "TASK-DEMO-003",
      title: "Restore approved VPN memberships"
    },
    {
      assignedToEmail: employeeEmail,
      category: "software",
      createdAt: at(-5),
      createdByEmail: managerEmail,
      description:
        "Complete the endpoint agent rollout and submit deployment evidence for supervisor review.",
      dueDate: at(1),
      lastProgressUpdateAt: at(-1, 11),
      priority: "medium",
      progress: 100,
      requestCode: "REQ-DEMO-003",
      startDate: at(-4),
      status: "waiting_review",
      taskCode: "TASK-DEMO-004",
      title: "Deploy endpoint protection agents"
    },
    {
      assignedToEmail: employeeEmail,
      category: "network",
      completedAt: at(-5, 16),
      createdAt: at(-11),
      createdByEmail: supervisorEmail,
      description:
        "Capture traffic during the affected window, identify saturation, and apply the approved QoS correction.",
      dueDate: at(-4),
      lastProgressUpdateAt: at(-5, 16),
      priority: "urgent",
      progress: 100,
      requestCode: "REQ-DEMO-004",
      reviewedByEmail: supervisorEmail,
      startDate: at(-10),
      status: "completed",
      taskCode: "TASK-DEMO-005",
      title: "Trace and resolve morning network congestion"
    },
    {
      assignedToEmail: supervisorEmail,
      category: "access",
      completedAt: at(-3, 14),
      createdAt: at(-9),
      createdByEmail: managerEmail,
      description:
        "Create approved accounts and access groups, then validate access with the department owner.",
      dueDate: at(-3),
      lastProgressUpdateAt: at(-3, 14),
      priority: "medium",
      progress: 100,
      requestCode: "REQ-DEMO-005",
      reviewedByEmail: managerEmail,
      startDate: at(-8),
      status: "completed",
      taskCode: "TASK-DEMO-006",
      title: "Create Finance analyst accounts"
    },
    {
      assignedToEmail: supervisorEmail,
      category: "maintenance",
      createdAt: at(-1),
      createdByEmail: managerEmail,
      description:
        "Review the latest restore exercise evidence and document corrective actions for any missed recovery objectives.",
      dueDate: at(5),
      priority: "medium",
      progress: 0,
      status: "open",
      taskCode: "TASK-DEMO-007",
      title: "Review backup restore test results"
    },
    {
      assignedToEmail: employeeEmail,
      category: "server",
      createdAt: at(-4),
      createdByEmail: supervisorEmail,
      description:
        "Renew expiring certificates, deploy the approved chain, and validate monitoring integrations.",
      dueDate: at(3),
      lastProgressUpdateAt: at(0, 8),
      priority: "high",
      progress: 70,
      startDate: at(-3),
      status: "in_progress",
      taskCode: "TASK-DEMO-008",
      title: "Renew internal monitoring certificates"
    },
    {
      assignedToEmail: employeeEmail,
      category: "software",
      createdAt: at(-4, 11),
      createdByEmail: managerEmail,
      description:
        "Package the requested printer driver for managed deployment after compatibility review.",
      dueDate: at(4),
      lastProgressUpdateAt: at(-3),
      priority: "low",
      progress: 10,
      requestCode: "REQ-DEMO-006",
      startDate: at(-4, 13),
      status: "cancelled",
      taskCode: "TASK-DEMO-009",
      title: "Package requested printer driver"
    }
  ];

  const taskUpdates: readonly DevelopmentTaskUpdateSeed[] = [
    { createdAt: at(-5, 10), newProgress: 10, newStatus: "in_progress", note: "Firmware inventory completed and maintenance window confirmed.", previousProgress: 0, previousStatus: "open", taskCode: "TASK-DEMO-001", updatedByEmail: employeeEmail },
    { createdAt: at(-1, 14), newProgress: 45, newStatus: "in_progress", note: "Management interfaces configured; monitoring registration is in progress.", previousProgress: 10, previousStatus: "in_progress", taskCode: "TASK-DEMO-001", updatedByEmail: employeeEmail },
    { createdAt: at(-6, 11), newProgress: 30, newStatus: "in_progress", note: "Rack location confirmed and cable path documented.", previousProgress: 0, previousStatus: "open", taskCode: "TASK-DEMO-002", updatedByEmail: supervisorEmail },
    { createdAt: at(-2, 16), newProgress: 30, newStatus: "blocked", note: "Waiting for Facilities to confirm redundant power capacity.", previousProgress: 30, previousStatus: "in_progress", taskCode: "TASK-DEMO-002", updatedByEmail: supervisorEmail },
    { createdAt: at(-4, 10), newProgress: 60, newStatus: "in_progress", note: "Agent deployed to the first workstation group with no policy errors.", previousProgress: 0, previousStatus: "open", taskCode: "TASK-DEMO-004", updatedByEmail: employeeEmail },
    { createdAt: at(-1, 11), newProgress: 100, newStatus: "waiting_review", note: "Deployment completed on all approved Finance workstations; evidence attached to the change record.", previousProgress: 60, previousStatus: "in_progress", taskCode: "TASK-DEMO-004", updatedByEmail: employeeEmail },
    { createdAt: at(-10, 13), newProgress: 35, newStatus: "in_progress", note: "Traffic captures show uplink saturation during backup replication.", previousProgress: 0, previousStatus: "open", taskCode: "TASK-DEMO-005", updatedByEmail: employeeEmail },
    { createdAt: at(-5, 16), newProgress: 100, newStatus: "completed", note: "QoS correction applied and peak-hour latency returned to baseline.", previousProgress: 35, previousStatus: "in_progress", taskCode: "TASK-DEMO-005", updatedByEmail: supervisorEmail },
    { createdAt: at(-3, 14), newProgress: 100, newStatus: "completed", note: "Department owner validated all approved application and shared-folder access.", previousProgress: 80, previousStatus: "in_progress", taskCode: "TASK-DEMO-006", updatedByEmail: managerEmail },
    { createdAt: at(-3, 9), newProgress: 25, newStatus: "in_progress", note: "Certificate inventory and dependency map completed.", previousProgress: 0, previousStatus: "open", taskCode: "TASK-DEMO-008", updatedByEmail: employeeEmail },
    { createdAt: at(0, 8), newProgress: 70, newStatus: "in_progress", note: "Certificates renewed in staging; production deployment is scheduled.", previousProgress: 25, previousStatus: "in_progress", taskCode: "TASK-DEMO-008", updatedByEmail: employeeEmail },
    { createdAt: at(-3), newProgress: 10, newStatus: "cancelled", note: "Task cancelled after security review rejected the unsupported package.", previousProgress: 10, previousStatus: "in_progress", taskCode: "TASK-DEMO-009", updatedByEmail: managerEmail }
  ];

  const comments: readonly DevelopmentCommentSeed[] = [
    { body: "Delivery coordination is complete. Keep the migration outside business hours and retain the rollback plan.", createdAt: at(-7, 12), createdByEmail: managerEmail, isInternal: true, requestCode: "REQ-DEMO-001" },
    { body: "Rack readiness is the current dependency; Facilities confirmation is still pending.", createdAt: at(-2, 16), createdByEmail: supervisorEmail, isInternal: false, requestCode: "REQ-DEMO-001" },
    { body: "The approved user list has been received from Field Engineering.", createdAt: at(-2, 13), createdByEmail: employeeEmail, isInternal: false, requestCode: "REQ-DEMO-002" },
    { body: "MFA verification must be completed before group membership is restored.", createdAt: at(-1, 9), createdByEmail: supervisorEmail, isInternal: true, requestCode: "REQ-DEMO-002" },
    { body: "Deployment completed. Supervisor review of the workstation compliance report is pending.", createdAt: at(-1, 11), createdByEmail: employeeEmail, isInternal: false, requestCode: "REQ-DEMO-003" },
    { body: "Monitoring confirms normal latency for two consecutive peak periods.", createdAt: at(-5, 16), createdByEmail: supervisorEmail, isInternal: false, requestCode: "REQ-DEMO-004" },
    { body: "Finance confirmed that all approved access works as expected. Request can be closed.", createdAt: at(-2, 14), createdByEmail: managerEmail, isInternal: false, requestCode: "REQ-DEMO-005" },
    { body: "Rejected because the package is unsupported and fails the managed workstation security baseline.", createdAt: at(-3, 9), createdByEmail: managerEmail, isInternal: false, requestCode: "REQ-DEMO-006" }
  ];

  return { comments, requests, taskUpdates, tasks, users };
}
