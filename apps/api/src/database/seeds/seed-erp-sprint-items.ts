import { RoleModel } from "../../modules/roles/role.model";
import { SprintModel } from "../../modules/sprints/sprint.model";
import { TaskUpdateModel } from "../../modules/task-updates/task-update.model";
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
  taskUpdatesDeleted: number;
  tasksDeleted: number;
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
    description: "Payrole module setup and data collection task for the Finance department.",
    dueDate: new Date("2026-07-24T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Payrole",
    taskCode: "ERP-FIN-0001",
    title: "payrole"
  })
];

export async function seedErpSprintItems(): Promise<ErpSprintItemsSeedResult> {
  const result: ErpSprintItemsSeedResult = {
    sprintItemsCreated: 0,
    sprintItemsUpdated: 0,
    sprintsCreated: 0,
    sprintsUpdated: 0,
    taskUpdatesDeleted: 0,
    tasksDeleted: 0
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

  const taskUpdateDeleteResult = await TaskUpdateModel.deleteMany({});
  const taskDeleteResult = await TaskModel.deleteMany({});
  result.taskUpdatesDeleted = taskUpdateDeleteResult.deletedCount;
  result.tasksDeleted = taskDeleteResult.deletedCount;

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

    await TaskModel.create({
      ...values,
      taskCode: itemSeed.taskCode
    });
    result.sprintItemsCreated += 1;
  }

  return result;
}
