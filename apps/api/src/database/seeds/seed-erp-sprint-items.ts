import { RoleModel } from "../../modules/roles/role.model";
import { SprintModel } from "../../modules/sprints/sprint.model";
import { TaskModel } from "../../modules/tasks/task.model";
import { UserModel } from "../../modules/users/user.model";
import type { Priority } from "../../shared/constants/request.constants";
import type { SprintArea, SprintStatus } from "../../shared/constants/sprint.constants";
import type {
  TaskCategory,
  TaskStatus
} from "../../shared/constants/task.constants";

type SprintSeed = {
  active: boolean;
  code: string;
  createdByEmail?: string;
  description: string;
  name: string;
  ownerEmail: string;
  progressTarget: number;
  sprintArea: SprintArea;
  startDate: Date;
  status: SprintStatus;
  targetDate: Date;
};

type SprintItemSeed = {
  assignedToEmail?: string;
  blockedReason?: string;
  category: TaskCategory;
  createdByEmail: string;
  description: string;
  dueDate: Date;
  mainModule?: string;
  priority: Priority;
  progress: number;
  startDate?: Date;
  status: TaskStatus;
  subModule?: string;
  taskCode: string;
  title: string;
};

export interface ErpSprintItemsSeedResult {
  sprintItemsCreated: number;
  sprintItemsUpdated: number;
  sprintsCreated: number;
  sprintsUpdated: number;
}

const ziedEmail = "zied.hasni@harouge.com";
const amerEmail = "amer.ghbeini@harouge.com";

const sprintSeeds: SprintSeed[] = [
  {
    active: true,
    code: "ERP-DEV-SPRINT",
    description: "ERP modules, user interface, APIs, integrations, testing, and delivery readiness.",
    name: "Development Sprint",
    ownerEmail: ziedEmail,
    progressTarget: 0,
    sprintArea: "development",
    startDate: new Date("2026-06-20T09:00:00.000Z"),
    status: "in_progress",
    targetDate: new Date("2026-07-31T17:00:00.000Z")
  },
  {
    active: true,
    code: "ERP-FAC-SPRINT",
    description: "Facilities readiness for ERP rollout rooms, workstations, and training spaces.",
    name: "Facility Sprint",
    ownerEmail: ziedEmail,
    progressTarget: 0,
    sprintArea: "facility",
    startDate: new Date("2026-06-20T09:00:00.000Z"),
    status: "in_progress",
    targetDate: new Date("2026-08-15T17:00:00.000Z")
  },
  {
    active: true,
    code: "ERP-INF-SPRINT",
    description: "Servers, network, access, backup, and hosting readiness for ERP operations.",
    name: "Infrastructure Sprint",
    ownerEmail: amerEmail,
    progressTarget: 10,
    sprintArea: "infrastructure",
    startDate: new Date("2026-06-20T09:00:00.000Z"),
    status: "at_risk",
    targetDate: new Date("2026-08-30T17:00:00.000Z")
  },
  {
    active: true,
    code: "ERP-MDC-SPRINT",
    createdByEmail: ziedEmail,
    description: "Master data collection, validation, completion tracking, and department readiness.",
    name: "Master Data Collection",
    ownerEmail: ziedEmail,
    progressTarget: 0,
    sprintArea: "master_data_collection",
    startDate: new Date("2026-06-20T09:00:00.000Z"),
    status: "in_progress",
    targetDate: new Date("2026-08-20T17:00:00.000Z")
  }
];

type SprintItemSeedInput = Omit<
  SprintItemSeed,
  "createdByEmail" | "dueDate" | "priority"
> & {
  dueDate?: Date;
  priority?: Priority;
};

function sprintItemSeed(seed: SprintItemSeedInput): SprintItemSeed {
  const {
    dueDate,
    priority,
    ...values
  } = seed;

  return {
    assignedToEmail: ziedEmail,
    createdByEmail: ziedEmail,
    dueDate: dueDate ?? new Date("2026-07-24T17:00:00.000Z"),
    priority: priority ?? "medium",
    ...values
  };
}

const sprintItemSeeds: SprintItemSeed[] = [
  sprintItemSeed({
    category: "software",
    description: "Collect Finance master data for finance records, reporting needs, and ERP import readiness.",
    dueDate: new Date("2026-07-24T17:00:00.000Z"),
    mainModule: "Finance Department",
    priority: "high",
    progress: 60,
    status: "in_progress",
    subModule: "Financial Reporting",
    taskCode: "ERP-MDC-0005",
    title: "Collect Finance data"
  }),
  sprintItemSeed({
    category: "software",
    description: "Design the workflow where assigned users update progress, completion state, and review notes for ERP sprint items.",
    dueDate: new Date("2026-07-15T17:00:00.000Z"),
    mainModule: "Finance Department",
    progress: 45,
    status: "in_progress",
    subModule: "Payroll",
    taskCode: "ERP-DEV-0004",
    title: "Build employee sprint item progress workflow"
  }),
  sprintItemSeed({
    blockedReason: "ERP server delivery is still pending, which blocks finance environment readiness for accounts payable validation.",
    category: "server",
    description: "Track the requested ERP server delivery, handover, and readiness confirmation before finance validation can continue.",
    dueDate: new Date("2026-07-10T17:00:00.000Z"),
    mainModule: "Finance Department",
    priority: "high",
    progress: 0,
    startDate: new Date("2026-06-24T09:00:00.000Z"),
    status: "blocked",
    subModule: "Accounts Payable",
    taskCode: "ERP-INF-0001",
    title: "Await server delivery and readiness"
  }),
  sprintItemSeed({
    category: "software",
    description: "Approve payroll master data mapping for salaries, allowances, deductions, and ERP payroll posting.",
    mainModule: "Finance Department",
    progress: 100,
    status: "completed",
    subModule: "Payroll",
    taskCode: "ERP-FIN-0001",
    title: "Approve payroll master data mapping"
  }),
  sprintItemSeed({
    category: "software",
    description: "Reconcile payroll deduction records against finance controls before ERP migration.",
    mainModule: "Finance Department",
    progress: 100,
    status: "completed",
    subModule: "Payroll",
    taskCode: "ERP-FIN-0002",
    title: "Reconcile payroll deduction records"
  }),
  sprintItemSeed({
    category: "software",
    description: "Sign off the financial reporting template list and ownership matrix.",
    mainModule: "Finance Department",
    progress: 100,
    status: "completed",
    subModule: "Financial Reporting",
    taskCode: "ERP-FIN-0003",
    title: "Sign off financial report templates"
  }),
  sprintItemSeed({
    category: "software",
    description: "Confirm supplier opening balances and accounts payable import controls.",
    mainModule: "Finance Department",
    progress: 100,
    status: "completed",
    subModule: "Accounts Payable",
    taskCode: "ERP-FIN-0004",
    title: "Confirm supplier opening balances"
  }),
  sprintItemSeed({
    category: "software",
    description: "Approve annual budget baseline categories, owners, and control totals.",
    mainModule: "Finance Department",
    progress: 100,
    status: "completed",
    subModule: "Budgeting",
    taskCode: "ERP-FIN-0005",
    title: "Approve annual budget baseline"
  }),
  sprintItemSeed({
    category: "software",
    description: "Map finance approval workflow levels and escalation paths for ERP setup.",
    mainModule: "Finance Department",
    progress: 30,
    status: "in_progress",
    subModule: "Financial Reporting",
    taskCode: "ERP-FIN-0006",
    title: "Map finance approval workflow"
  }),
  sprintItemSeed({
    category: "software",
    description: "Validate vendor invoice matching rules for accounts payable processing.",
    mainModule: "Finance Department",
    progress: 60,
    status: "in_progress",
    subModule: "Accounts Payable",
    taskCode: "ERP-FIN-0007",
    title: "Validate vendor invoice matching rules"
  }),
  sprintItemSeed({
    category: "software",
    description: "Collect budget owner allocation sheets for ERP budgeting setup.",
    mainModule: "Finance Department",
    progress: 20,
    status: "open",
    subModule: "Budgeting",
    taskCode: "ERP-FIN-0008",
    title: "Collect budget owner allocation sheets"
  }),
  sprintItemSeed({
    category: "software",
    description: "Review cost center budget mapping with Finance Department owners.",
    mainModule: "Finance Department",
    progress: 20,
    status: "open",
    subModule: "Budgeting",
    taskCode: "ERP-FIN-0009",
    title: "Review cost center budget mapping"
  }),
  sprintItemSeed({
    category: "software",
    description: "Prepare budget variance reporting inputs for ERP financial reporting.",
    mainModule: "Finance Department",
    progress: 20,
    status: "open",
    subModule: "Budgeting",
    taskCode: "ERP-FIN-0010",
    title: "Prepare budget variance reporting inputs"
  }),

  sprintItemSeed({
    category: "other",
    description: "Collect HR master data for employees, personnel records, and ERP readiness tracking.",
    dueDate: new Date("2026-07-21T17:00:00.000Z"),
    mainModule: "Personnel Affairs Department",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Employee Records",
    taskCode: "ERP-MDC-0004",
    title: "Collect HR data"
  }),
  sprintItemSeed({
    category: "other",
    description: "Verify employee master file ownership and required fields.",
    mainModule: "Personnel Affairs Department",
    progress: 20,
    status: "in_progress",
    subModule: "Employee Records",
    taskCode: "ERP-HR-0001",
    title: "Verify employee master file fields"
  }),
  sprintItemSeed({
    category: "other",
    description: "Review attendance codes and absence categories for ERP configuration.",
    mainModule: "Personnel Affairs Department",
    progress: 20,
    status: "in_progress",
    subModule: "Attendance",
    taskCode: "ERP-HR-0002",
    title: "Review attendance code mapping"
  }),
  sprintItemSeed({
    category: "other",
    description: "Collect benefits eligibility records for active employees.",
    mainModule: "Personnel Affairs Department",
    progress: 25,
    status: "in_progress",
    subModule: "Benefits",
    taskCode: "ERP-HR-0003",
    title: "Collect benefits eligibility records"
  }),
  sprintItemSeed({
    category: "other",
    description: "Validate recruitment position references and approval paths.",
    mainModule: "Personnel Affairs Department",
    progress: 30,
    status: "in_progress",
    subModule: "Recruitment",
    taskCode: "ERP-HR-0004",
    title: "Validate recruitment position references"
  }),
  sprintItemSeed({
    category: "other",
    description: "Match job title records with ERP personnel structures.",
    mainModule: "Personnel Affairs Department",
    progress: 30,
    status: "in_progress",
    subModule: "Employee Records",
    taskCode: "ERP-HR-0005",
    title: "Match job title records"
  }),
  sprintItemSeed({
    category: "other",
    description: "Clean duplicate employee contact and identity references.",
    mainModule: "Personnel Affairs Department",
    progress: 35,
    status: "in_progress",
    subModule: "Employee Records",
    taskCode: "ERP-HR-0006",
    title: "Clean duplicate employee records"
  }),
  sprintItemSeed({
    category: "other",
    description: "Prepare HR service request categories for ERP routing.",
    mainModule: "Personnel Affairs Department",
    progress: 35,
    status: "in_progress",
    subModule: "HR Services",
    taskCode: "ERP-HR-0007",
    title: "Prepare HR service request categories"
  }),
  sprintItemSeed({
    category: "other",
    description: "Review employee grade and allowance reference tables.",
    mainModule: "Personnel Affairs Department",
    progress: 40,
    status: "in_progress",
    subModule: "Benefits",
    taskCode: "ERP-HR-0008",
    title: "Review employee grade reference tables"
  }),
  sprintItemSeed({
    category: "other",
    description: "Confirm HR data approval owners for migration signoff.",
    mainModule: "Personnel Affairs Department",
    progress: 45,
    status: "in_progress",
    subModule: "Employee Records",
    taskCode: "ERP-HR-0009",
    title: "Confirm HR data approval owners"
  }),

  sprintItemSeed({
    category: "server",
    description: "Prepare ERP application server inventory and environment references.",
    mainModule: "Information Technology Department",
    progress: 10,
    status: "in_progress",
    subModule: "Infrastructure",
    taskCode: "ERP-IT-0001",
    title: "Prepare ERP server inventory"
  }),
  sprintItemSeed({
    category: "network",
    description: "Review network access requirements for ERP users and sites.",
    mainModule: "Information Technology Department",
    progress: 20,
    status: "in_progress",
    subModule: "Network",
    taskCode: "ERP-IT-0002",
    title: "Review ERP network access requirements"
  }),
  sprintItemSeed({
    category: "software",
    description: "Collect ERP application integration endpoint details.",
    mainModule: "Information Technology Department",
    progress: 25,
    status: "in_progress",
    subModule: "Applications",
    taskCode: "ERP-IT-0003",
    title: "Collect integration endpoint details"
  }),
  sprintItemSeed({
    category: "access",
    description: "Build role-based access matrix for IT-owned ERP functions.",
    mainModule: "Information Technology Department",
    progress: 30,
    status: "in_progress",
    subModule: "Access Management",
    taskCode: "ERP-IT-0004",
    title: "Build ERP access matrix"
  }),
  sprintItemSeed({
    category: "server",
    description: "Confirm backup windows and restore responsibilities for ERP services.",
    mainModule: "Information Technology Department",
    progress: 30,
    status: "in_progress",
    subModule: "Infrastructure",
    taskCode: "ERP-IT-0005",
    title: "Confirm ERP backup windows"
  }),
  sprintItemSeed({
    category: "network",
    description: "Validate network readiness for training and project rooms.",
    mainModule: "Information Technology Department",
    progress: 35,
    status: "in_progress",
    subModule: "Network",
    taskCode: "ERP-IT-0006",
    title: "Validate project room network readiness"
  }),
  sprintItemSeed({
    category: "software",
    description: "Prepare ERP service desk categories and escalation logic.",
    mainModule: "Information Technology Department",
    progress: 35,
    status: "in_progress",
    subModule: "Service Desk",
    taskCode: "ERP-IT-0007",
    title: "Prepare ERP service desk categories"
  }),
  sprintItemSeed({
    category: "access",
    description: "Review cybersecurity access controls for ERP administration.",
    mainModule: "Information Technology Department",
    progress: 40,
    status: "in_progress",
    subModule: "Cybersecurity",
    taskCode: "ERP-IT-0008",
    title: "Review ERP cybersecurity controls"
  }),
  sprintItemSeed({
    category: "software",
    description: "Map IT document control references for ERP project evidence.",
    mainModule: "Information Technology Department",
    progress: 40,
    status: "in_progress",
    subModule: "Applications",
    taskCode: "ERP-IT-0009",
    title: "Map IT document control references"
  }),
  sprintItemSeed({
    category: "hardware",
    description: "Confirm workstation readiness for ERP implementation users.",
    mainModule: "Information Technology Department",
    progress: 45,
    status: "in_progress",
    subModule: "Hardware",
    taskCode: "ERP-IT-0010",
    title: "Confirm ERP workstation readiness"
  }),
  sprintItemSeed({
    category: "server",
    description: "Review ERP hosting resource allocation and ownership.",
    mainModule: "Information Technology Department",
    progress: 50,
    status: "in_progress",
    subModule: "Infrastructure",
    taskCode: "ERP-IT-0011",
    title: "Review ERP hosting allocation"
  }),
  sprintItemSeed({
    category: "software",
    description: "Prepare ERP configuration support checklist.",
    mainModule: "Information Technology Department",
    progress: 60,
    status: "in_progress",
    subModule: "ERP",
    taskCode: "ERP-IT-0012",
    title: "Prepare ERP support checklist"
  }),

  sprintItemSeed({
    category: "other",
    description: "Collect warehouse item master fields required for ERP inventory setup.",
    mainModule: "Materials and Warehouses Department",
    progress: 0,
    status: "open",
    subModule: "Inventory",
    taskCode: "ERP-MAT-0001",
    title: "Collect item master fields"
  }),
  sprintItemSeed({
    category: "other",
    description: "Review stock control codes and inventory ownership references.",
    mainModule: "Materials and Warehouses Department",
    progress: 10,
    status: "in_progress",
    subModule: "Stock Control",
    taskCode: "ERP-MAT-0002",
    title: "Review stock control codes"
  }),
  sprintItemSeed({
    category: "other",
    description: "Validate warehouse location naming and storage hierarchy.",
    mainModule: "Materials and Warehouses Department",
    progress: 15,
    status: "in_progress",
    subModule: "Warehouses",
    taskCode: "ERP-MAT-0003",
    title: "Validate warehouse location hierarchy"
  }),
  sprintItemSeed({
    category: "other",
    description: "Prepare procurement support material category mapping.",
    mainModule: "Materials and Warehouses Department",
    progress: 20,
    status: "in_progress",
    subModule: "Procurement Support",
    taskCode: "ERP-MAT-0004",
    title: "Prepare material category mapping"
  }),
  sprintItemSeed({
    category: "other",
    description: "Match inventory units of measure with ERP item setup.",
    mainModule: "Materials and Warehouses Department",
    progress: 20,
    status: "in_progress",
    subModule: "Inventory",
    taskCode: "ERP-MAT-0005",
    title: "Match inventory units of measure"
  }),
  sprintItemSeed({
    category: "other",
    description: "Review warehouse approval rules for material movements.",
    mainModule: "Materials and Warehouses Department",
    progress: 25,
    status: "in_progress",
    subModule: "Warehouses",
    taskCode: "ERP-MAT-0006",
    title: "Review warehouse approval rules"
  }),
  sprintItemSeed({
    category: "other",
    description: "Clean obsolete material references before ERP import.",
    mainModule: "Materials and Warehouses Department",
    progress: 30,
    status: "in_progress",
    subModule: "Inventory",
    taskCode: "ERP-MAT-0007",
    title: "Clean obsolete material references"
  }),
  sprintItemSeed({
    category: "other",
    description: "Confirm stock count readiness and responsible owners.",
    mainModule: "Materials and Warehouses Department",
    progress: 35,
    status: "in_progress",
    subModule: "Stock Control",
    taskCode: "ERP-MAT-0008",
    title: "Confirm stock count readiness"
  }),
  sprintItemSeed({
    category: "other",
    description: "Prepare material data exception report for department review.",
    mainModule: "Materials and Warehouses Department",
    progress: 43,
    status: "in_progress",
    subModule: "Inventory",
    taskCode: "ERP-MAT-0009",
    title: "Prepare material data exception report"
  }),

  sprintItemSeed({
    category: "other",
    description: "Collect production operation reference data for ERP setup.",
    mainModule: "Operations Department",
    progress: 10,
    status: "in_progress",
    subModule: "Production Operations",
    taskCode: "ERP-OPS-0001",
    title: "Collect production operation references"
  }),
  sprintItemSeed({
    category: "other",
    description: "Review field operations location hierarchy and ownership.",
    mainModule: "Operations Department",
    progress: 20,
    status: "in_progress",
    subModule: "Field Operations",
    taskCode: "ERP-OPS-0002",
    title: "Review field operations hierarchy"
  }),
  sprintItemSeed({
    category: "other",
    description: "Map dispatch planning references for ERP operations workflows.",
    mainModule: "Operations Department",
    progress: 25,
    status: "in_progress",
    subModule: "Dispatch",
    taskCode: "ERP-OPS-0003",
    title: "Map dispatch planning references"
  }),
  sprintItemSeed({
    category: "other",
    description: "Collect daily reports fields and operational signoff owners.",
    mainModule: "Operations Department",
    progress: 30,
    status: "in_progress",
    subModule: "Daily Reports",
    taskCode: "ERP-OPS-0004",
    title: "Collect daily report fields"
  }),
  sprintItemSeed({
    category: "other",
    description: "Validate production operation status codes.",
    mainModule: "Operations Department",
    progress: 30,
    status: "in_progress",
    subModule: "Production Operations",
    taskCode: "ERP-OPS-0005",
    title: "Validate production status codes"
  }),
  sprintItemSeed({
    category: "other",
    description: "Confirm field operation contacts for ERP operational routing.",
    mainModule: "Operations Department",
    progress: 31,
    status: "in_progress",
    subModule: "Field Operations",
    taskCode: "ERP-OPS-0006",
    title: "Confirm field operation contacts"
  }),
  sprintItemSeed({
    category: "other",
    description: "Prepare dispatch shift reference data.",
    mainModule: "Operations Department",
    progress: 35,
    status: "in_progress",
    subModule: "Dispatch",
    taskCode: "ERP-OPS-0007",
    title: "Prepare dispatch shift references"
  }),
  sprintItemSeed({
    category: "other",
    description: "Review operational daily report validation rules.",
    mainModule: "Operations Department",
    progress: 35,
    status: "in_progress",
    subModule: "Daily Reports",
    taskCode: "ERP-OPS-0008",
    title: "Review daily report validation rules"
  }),
  sprintItemSeed({
    category: "other",
    description: "Collect operations master data gaps for department review.",
    mainModule: "Operations Department",
    progress: 40,
    status: "in_progress",
    subModule: "Production Operations",
    taskCode: "ERP-OPS-0009",
    title: "Collect operations data gaps"
  }),
  sprintItemSeed({
    category: "other",
    description: "Validate operations readiness report for ERP phase tracking.",
    mainModule: "Operations Department",
    progress: 40,
    status: "in_progress",
    subModule: "Daily Reports",
    taskCode: "ERP-OPS-0010",
    title: "Validate operations readiness report"
  }),
  sprintItemSeed({
    category: "other",
    description: "Confirm operations final data owners and review cadence.",
    mainModule: "Operations Department",
    progress: 45,
    status: "in_progress",
    subModule: "Field Operations",
    taskCode: "ERP-OPS-0011",
    title: "Confirm operations data owners"
  })
];

export async function seedErpSprintItems(): Promise<ErpSprintItemsSeedResult> {
  const result: ErpSprintItemsSeedResult = {
    sprintItemsCreated: 0,
    sprintItemsUpdated: 0,
    sprintsCreated: 0,
    sprintsUpdated: 0
  };

  const users = await UserModel.find({
    email: { $in: [ziedEmail, amerEmail] }
  });
  const usersByEmail = new Map(users.map((user) => [user.email, user]));
  const zied = usersByEmail.get(ziedEmail);

  if (!zied) {
    throw new Error("Zied Hasni must exist before ERP sprint item seed runs.");
  }

  const superAdminRole = await RoleModel.findOne({ name: "super_admin" });
  const superAdmin = superAdminRole
    ? await UserModel.findOne({
        roleId: superAdminRole._id,
        status: "active"
      }).sort({ createdAt: 1 })
    : undefined;
  const defaultCreator = superAdmin ?? zied;

  for (const sprintSeed of sprintSeeds) {
    const owner = usersByEmail.get(sprintSeed.ownerEmail) ?? zied;
    const creator = sprintSeed.createdByEmail
      ? usersByEmail.get(sprintSeed.createdByEmail)
      : defaultCreator;

    if (!creator) {
      throw new Error(`Sprint creator does not exist: ${sprintSeed.createdByEmail}`);
    }

    const values = {
      active: sprintSeed.active,
      createdBy: creator._id,
      description: sprintSeed.description,
      name: sprintSeed.name,
      notifyLater: false,
      ownerId: owner._id,
      progressTarget: sprintSeed.progressTarget,
      sprintArea: sprintSeed.sprintArea,
      startDate: sprintSeed.startDate,
      status: sprintSeed.status,
      targetDate: sprintSeed.targetDate
    };
    const existingSprint = await SprintModel.findOne({ code: sprintSeed.code });

    if (!existingSprint) {
      await SprintModel.create({
        ...values,
        code: sprintSeed.code
      });
      result.sprintsCreated += 1;
      continue;
    }

    existingSprint.set(values);
    await existingSprint.save();
    result.sprintsUpdated += 1;
  }

  for (const itemSeed of sprintItemSeeds) {
    const creator = usersByEmail.get(itemSeed.createdByEmail);

    if (!creator) {
      throw new Error(`Sprint item creator does not exist: ${itemSeed.createdByEmail}`);
    }

    const assignee = itemSeed.assignedToEmail
      ? usersByEmail.get(itemSeed.assignedToEmail)
      : undefined;

    if (itemSeed.assignedToEmail && !assignee) {
      throw new Error(`Sprint item assignee does not exist: ${itemSeed.assignedToEmail}`);
    }

    const values = {
      ...(assignee ? { assignedTo: assignee._id } : {}),
      ...(itemSeed.blockedReason ? { blockedReason: itemSeed.blockedReason } : {}),
      category: itemSeed.category,
      createdBy: creator._id,
      description: itemSeed.description,
      dueDate: itemSeed.dueDate,
      lastProgressUpdateAt: new Date(),
      ...(itemSeed.mainModule ? { mainModule: itemSeed.mainModule } : {}),
      priority: itemSeed.priority,
      progress: itemSeed.progress,
      ...(itemSeed.startDate ? { startDate: itemSeed.startDate } : {}),
      status: itemSeed.status,
      ...(itemSeed.subModule ? { subModule: itemSeed.subModule } : {}),
      title: itemSeed.title
    };
    const existingItem = await TaskModel.findOne({ taskCode: itemSeed.taskCode });

    if (!existingItem) {
      await TaskModel.create({
        ...values,
        taskCode: itemSeed.taskCode
      });
      result.sprintItemsCreated += 1;
      continue;
    }

    existingItem.set(values);

    if (!assignee) {
      existingItem.set("assignedTo", undefined);
    }

    if (!itemSeed.blockedReason) {
      existingItem.set("blockedReason", undefined);
    }

    if (!itemSeed.startDate) {
      existingItem.set("startDate", undefined);
    }

    if (!itemSeed.mainModule) {
      existingItem.set("mainModule", undefined);
    }

    if (!itemSeed.subModule) {
      existingItem.set("subModule", undefined);
    }

    await existingItem.save();
    result.sprintItemsUpdated += 1;
  }

  return result;
}
