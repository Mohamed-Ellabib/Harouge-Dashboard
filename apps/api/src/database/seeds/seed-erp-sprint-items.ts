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
  priority: Priority;
  progress: number;
  startDate?: Date;
  status: TaskStatus;
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
  }
];

const sprintItemSeeds: SprintItemSeed[] = [
  {
    assignedToEmail: ziedEmail,
    blockedReason: "ERP server request was submitted and the team is waiting for delivery and handover confirmation.",
    category: "server",
    createdByEmail: ziedEmail,
    description: "Track the requested ERP server delivery, handover, and readiness confirmation before infrastructure configuration can continue.",
    dueDate: new Date("2026-07-10T17:00:00.000Z"),
    priority: "high",
    progress: 10,
    startDate: new Date("2026-06-24T09:00:00.000Z"),
    status: "blocked",
    taskCode: "ERP-INF-0001",
    title: "Await ERP server delivery and readiness"
  },
  {
    category: "software",
    createdByEmail: ziedEmail,
    description: "Define and verify ERP user roles, access groups, and approval responsibilities before implementation starts.",
    dueDate: new Date("2026-07-08T17:00:00.000Z"),
    priority: "high",
    progress: 0,
    status: "open",
    taskCode: "ERP-DEV-0001",
    title: "Finalize ERP authentication and access matrix"
  },
  {
    category: "software",
    createdByEmail: ziedEmail,
    description: "Design the workflow where assigned users update progress, completion state, and review notes for ERP sprint items.",
    dueDate: new Date("2026-07-15T17:00:00.000Z"),
    priority: "medium",
    progress: 0,
    status: "open",
    taskCode: "ERP-DEV-0002",
    title: "Build employee sprint item progress workflow"
  },
  {
    category: "software",
    createdByEmail: ziedEmail,
    description: "Prepare dashboard widgets that summarize sprint areas, open items, blockers, and recent progress updates.",
    dueDate: new Date("2026-07-22T17:00:00.000Z"),
    priority: "medium",
    progress: 0,
    status: "open",
    taskCode: "ERP-DEV-0003",
    title: "Prepare ERP dashboard data widgets"
  },
  {
    category: "access",
    createdByEmail: ziedEmail,
    description: "Review the API contract for sprint reports, filters, status counts, and role-based visibility before the reports page is built.",
    dueDate: new Date("2026-07-29T17:00:00.000Z"),
    priority: "low",
    progress: 0,
    status: "open",
    taskCode: "ERP-DEV-0004",
    title: "Validate sprint reporting API contract"
  },
  {
    category: "maintenance",
    createdByEmail: ziedEmail,
    description: "Prepare the ERP project room layout, seating plan, and workstation placement for the implementation team.",
    dueDate: new Date("2026-07-12T17:00:00.000Z"),
    priority: "medium",
    progress: 0,
    status: "open",
    taskCode: "ERP-FAC-0001",
    title: "Prepare ERP project room workstation layout"
  },
  {
    category: "hardware",
    createdByEmail: ziedEmail,
    description: "Confirm display screens, cabling, and network points in the ERP training room before user training starts.",
    dueDate: new Date("2026-07-19T17:00:00.000Z"),
    priority: "high",
    progress: 0,
    status: "open",
    taskCode: "ERP-FAC-0002",
    title: "Confirm training room display and network points"
  },
  {
    category: "support",
    createdByEmail: ziedEmail,
    description: "Check desk readiness, workstation access, and support preparation for ERP user onboarding sessions.",
    dueDate: new Date("2026-07-26T17:00:00.000Z"),
    priority: "medium",
    progress: 0,
    status: "open",
    taskCode: "ERP-FAC-0003",
    title: "Validate user onboarding desk readiness"
  }
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
    const values = {
      active: sprintSeed.active,
      createdBy: defaultCreator._id,
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
      priority: itemSeed.priority,
      progress: itemSeed.progress,
      ...(itemSeed.startDate ? { startDate: itemSeed.startDate } : {}),
      status: itemSeed.status,
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

    await existingItem.save();
    result.sprintItemsUpdated += 1;
  }

  return result;
}
