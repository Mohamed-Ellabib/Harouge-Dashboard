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
    description:
      "Priority: P0 | Main Focus: Finance workshops, current-state assessment, forms, procedures, approval flows, key users, and pain points. | Main Deliverables: Finance requirement backlog, finance key users list, collected forms, current procedures, initial master data checklist. | Required Master Data: Existing GL codes, departments, locations, cost centers, approval matrix, vendor/customer baseline. | Department / Key Users: Finance leadership, payroll accountant, AP lead, AR lead, treasury lead. | Expected Output: Signed discovery pack and approved sprint backlog for finance implementation. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <Finance Product Owner> | Key User Placeholder: <Finance Super User>",
    dueDate: new Date("2026-07-10T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Finance Discovery",
    taskCode: "ERP-FIN-SPR-00",
    title: "Sprint 0: Finance Discovery & Master Data Preparation"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | Main Focus: Chart of accounts, account groups, cost centers, departments, locations, and financial coding structure. | Main Deliverables: Approved chart of accounts structure, cost center structure, department/location/field structure, account mapping rules. | Required Master Data: Legacy COA, cost center list, department/location hierarchy, account mapping templates. | Department / Key Users: Finance controller, chief accountant, cost control analyst. | Expected Output: Signed-off financial structure ready for configuration and data mapping. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <Finance Lead> | Key User Placeholder: <GL Key User>",
    dueDate: new Date("2026-07-17T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Financial Structure",
    taskCode: "ERP-FIN-SPR-01",
    title: "Sprint 1: Chart of Accounts & Financial Structure"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | Main Focus: Payroll under Finance including payroll account mapping, salary cost centers, allowances and deductions accounting, posting rules, and approvals. | Main Deliverables: Payroll account mapping, salary cost centers, allowance/deduction accounting rules, payroll posting rules, payroll approval workflow. | Required Master Data: Employee master, salary components, allowance/deduction catalog, payroll calendar, payroll approvers. | Department / Key Users: Payroll manager, finance manager, HR payroll coordinator. | Expected Output: Payroll financial posting process approved for pilot run. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <Payroll Process Owner> | Key User Placeholder: <Payroll Key User>",
    dueDate: new Date("2026-07-24T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Payroll",
    taskCode: "ERP-FIN-SPR-02",
    title: "Sprint 2: Payroll Financial Setup"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | Main Focus: Cash book, bank accounts, transactions, receipts, payments, and bank reconciliation. | Main Deliverables: Cash book module, bank master data, payment and receipt process, bank reconciliation workflow. | Required Master Data: Bank account master, transaction types, payment methods, reconciliation rules. | Department / Key Users: Treasury team, finance operations, cash management lead. | Expected Output: Controlled bank and cash processes with reconciliation cycle in place. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <Treasury Owner> | Key User Placeholder: <Bank Reconciliation Key User>",
    dueDate: new Date("2026-07-31T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Cash & Bank",
    taskCode: "ERP-FIN-SPR-03",
    title: "Sprint 3: Cash Book & Bank Management"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | Main Focus: Vendor financial process including supplier invoices, approvals, payable balances, payment requests, and AP reports. | Main Deliverables: Vendor financial master data, AP invoice process, AP approval workflow, payment request workflow, AP aging report. | Required Master Data: Vendor master, payment terms, tax rules, invoice types, approver matrix. | Department / Key Users: AP manager, procurement finance coordinator, payment controller. | Expected Output: End-to-end AP process ready with aging visibility and controls. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <AP Owner> | Key User Placeholder: <AP Key User>",
    dueDate: new Date("2026-08-07T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Accounts Payable",
    taskCode: "ERP-FIN-SPR-04",
    title: "Sprint 4: Accounts Payable and Vendor Financial Process"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | Main Focus: Customer receivables including AR invoices, receipts, balances, and AR reporting. | Main Deliverables: Customer master data, AR invoice process, receipt process, AR aging report. | Required Master Data: Customer master, credit terms, billing rules, receipt channels. | Department / Key Users: AR manager, billing officer, collections officer. | Expected Output: Standardized AR process with aging and receivables tracking. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <AR Owner> | Key User Placeholder: <AR Key User>",
    dueDate: new Date("2026-08-14T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Accounts Receivable",
    taskCode: "ERP-FIN-SPR-05",
    title: "Sprint 5: Accounts Receivable"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | Main Focus: General ledger and journals including manual and recurring journals, approvals, posting rules, and ledger inquiries. | Main Deliverables: Journal entry screens, approval workflow, posting logic, GL inquiry, trial balance draft. | Required Master Data: Journal templates, posting periods, ledger dimensions, approval limits. | Department / Key Users: GL accountant, finance controller, chief accountant. | Expected Output: Controlled GL operations and draft trial balance readiness. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <GL Owner> | Key User Placeholder: <GL Key User>",
    dueDate: new Date("2026-08-21T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "General Ledger",
    taskCode: "ERP-FIN-SPR-06",
    title: "Sprint 6: General Ledger and Journal Entries"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | Main Focus: Budgeting and cost control with budget upload, checks, commitments, actuals, and budget vs actual reporting. | Main Deliverables: Budget structure, budget upload process, budget check rules, commitment control, budget vs actual report. | Required Master Data: Budget versions, cost center budgets, commitment categories, fiscal calendar. | Department / Key Users: Budget manager, cost control lead, departmental budget owners. | Expected Output: Budget governance with proactive controls and variance reporting. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <Budget Owner> | Key User Placeholder: <Cost Control Key User>",
    dueDate: new Date("2026-08-28T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Budget Control",
    taskCode: "ERP-FIN-SPR-07",
    title: "Sprint 7: Budget and Cost Control"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | Main Focus: AFE and CAPEX financial controls with project budgeting and approval governance. | Main Deliverables: AFE financial coding, CAPEX tracking, project budget control, AFE approval workflow. | Required Master Data: CAPEX project master, AFE categories, approval thresholds, project budget baselines. | Department / Key Users: CAPEX controller, project finance analyst, finance approvers. | Expected Output: Controlled CAPEX execution with AFE-based financial compliance. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <CAPEX Owner> | Key User Placeholder: <AFE Key User>",
    dueDate: new Date("2026-09-04T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "AFE / CAPEX",
    taskCode: "ERP-FIN-SPR-08",
    title: "Sprint 8: AFE / CAPEX Financial Control"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | Main Focus: Fixed assets lifecycle including register, categories, depreciation, acquisition, disposal, transfer, and reporting. | Main Deliverables: Fixed asset register, depreciation setup, asset transaction process, asset reports. | Required Master Data: Asset classes, useful life rules, depreciation methods, opening asset balances. | Department / Key Users: Fixed asset accountant, finance controller, plant accounting representative. | Expected Output: Controlled asset accounting lifecycle with compliant depreciation. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <Fixed Asset Owner> | Key User Placeholder: <Asset Accountant>",
    dueDate: new Date("2026-09-11T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Fixed Assets",
    taskCode: "ERP-FIN-SPR-09",
    title: "Sprint 9: Fixed Assets"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | Main Focus: Foreign currency handling and month-end revaluation including FX gain/loss postings. | Main Deliverables: Exchange rate setup, revaluation journal process, FX gain/loss posting, revaluation report. | Required Master Data: Currency list, exchange rate sources, revaluation accounts, revaluation schedule. | Department / Key Users: Treasury accountant, GL accountant, month-end close team. | Expected Output: Reliable FX treatment and compliant period-end revaluation. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <FX Owner> | Key User Placeholder: <Revaluation Key User>",
    dueDate: new Date("2026-09-18T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "Foreign Currency",
    taskCode: "ERP-FIN-SPR-10",
    title: "Sprint 10: Foreign Currency and Revaluation"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | Main Focus: Finance reporting and dashboards for management control. | Main Deliverables: Trial balance, GL report, AP aging, AR aging, cash position report, budget vs actual report, payroll posting report, management dashboard. | Required Master Data: Reporting hierarchy, KPI definitions, dashboard role access, report filters. | Department / Key Users: CFO office, finance leadership, reporting analyst, key process owners. | Expected Output: Management-ready finance visibility across core control metrics. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <Reporting Owner> | Key User Placeholder: <Finance BI Key User>",
    dueDate: new Date("2026-09-25T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "Finance Reporting",
    taskCode: "ERP-FIN-SPR-11",
    title: "Sprint 11: Finance Reports and Dashboards"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | Main Focus: Finance UAT, issue resolution, opening balances, and go-live readiness. | Main Deliverables: UAT scenarios, test results, issue log, finance key user sign-off, opening balance checklist, go-live checklist. | Required Master Data: Opening balances, cutover mapping, final user access matrix, migration validation files. | Department / Key Users: Finance key users, PMO, IT ERP team, internal audit observer. | Expected Output: Approved finance go-live readiness and controlled cutover plan. | Status Placeholder: Not Started | Readiness Placeholder: 0% | Owner Placeholder: <UAT Owner> | Key User Placeholder: <Finance Cutover Lead>",
    dueDate: new Date("2026-10-02T17:00:00.000Z"),
    mainModule: "FINANCE",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "UAT & Go-Live",
    taskCode: "ERP-FIN-SPR-12",
    title: "Sprint 12: Finance UAT and Go-Live Preparation"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P0 | HUMAN RESOURCES Main Module: HUMAN RESOURCES Foundation | HUMAN RESOURCES Sub-Modules: HUMAN RESOURCES workshops, current HUMAN RESOURCES procedures, HUMAN RESOURCES forms collection, HUMAN RESOURCES reports collection, HUMAN RESOURCES key users, HUMAN RESOURCES approval workflows. | Main Focus: Collect existing HUMAN RESOURCES procedures, forms, reports, employee data structure, approval flows, key users, and HUMAN RESOURCES pain points. | Main Deliverables: HUMAN RESOURCES requirement backlog, HUMAN RESOURCES key users list, collected forms, current procedures, initial HUMAN RESOURCES master data checklist. | Required Master Data: Existing employee files, org hierarchy, job list, approval matrix, employment status definitions. | Department / Key Users: HUMAN RESOURCES manager, HUMAN RESOURCES operations lead, payroll coordinator, department HUMAN RESOURCES focal points. | Expected Output: Approved HUMAN RESOURCES discovery pack and implementation backlog ready after Finance and Payroll. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <HUMAN RESOURCES Product Owner> | Key User Placeholder: <HUMAN RESOURCES Super User>",
    dueDate: new Date("2026-10-09T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "HUMAN RESOURCES Foundation",
    taskCode: "ERP-HR-SPR-00",
    title: "Sprint 0: HUMAN RESOURCES Discovery & Master Data Preparation"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | HUMAN RESOURCES Main Module: Employee Management | HUMAN RESOURCES Sub-Modules: Employee profile, personal information, employment information, job details, department assignment, location assignment, employee status. | Main Focus: Build the employee master data structure early because it supports Payroll, Finance, Attendance, and workflow processes. | Main Deliverables: Employee profile structure, employee data fields, employee coding rules, employee status rules, employee data import template. | Required Master Data: Employee IDs, personal data fields, employment categories, department/location mapping, status values. | Department / Key Users: HUMAN RESOURCES master data team, HUMAN RESOURCES operations, payroll coordinator. | Expected Output: Controlled employee master ready for migration and downstream ERP modules. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Employee Master Owner> | Key User Placeholder: <Employee Data Key User>",
    dueDate: new Date("2026-10-16T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Employee Management",
    taskCode: "ERP-HR-SPR-01",
    title: "Sprint 1: HUMAN RESOURCES Employee Master Data"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | HUMAN RESOURCES Main Module: Organization & Manpower | HUMAN RESOURCES Sub-Modules: Company structure, departments, sections, positions, job titles, manpower planning, vacancy tracking. | Main Focus: Define the company organization structure and manpower plan early because it drives Payroll, Finance, Attendance, and approval workflows. | Main Deliverables: Department structure, section structure, position list, job title list, manpower plan, vacancy tracking process. | Required Master Data: Company hierarchy, position catalog, job titles, approved headcount, manpower requests. | Department / Key Users: HUMAN RESOURCES planning lead, organization development lead, department managers. | Expected Output: Approved organization and manpower baseline for ERP configuration. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Org Design Owner> | Key User Placeholder: <Manpower Planning Key User>",
    dueDate: new Date("2026-10-23T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Organization & Manpower",
    taskCode: "ERP-HR-SPR-02",
    title: "Sprint 2: HUMAN RESOURCES Organization Structure & Manpower"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | HUMAN RESOURCES Main Module: Compensation Management | HUMAN RESOURCES Sub-Modules: Salary grades, basic salary, allowances, benefits, deductions, employee compensation history, link with Payroll/Finance. | Main Focus: Define compensation structure and link it with Payroll under Finance. | Main Deliverables: Salary grade structure, allowances list, benefits list, deduction rules, compensation history, payroll mapping requirements. | Required Master Data: Salary grades, allowance codes, benefit catalog, deduction rules, payroll mapping reference. | Department / Key Users: Compensation and benefits lead, payroll coordinator, finance payroll lead. | Expected Output: Compensation framework aligned with Finance payroll posting and control requirements. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Compensation Owner> | Key User Placeholder: <Payroll Integration Key User>",
    dueDate: new Date("2026-10-30T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Compensation Management",
    taskCode: "ERP-HR-SPR-03",
    title: "Sprint 3: HUMAN RESOURCES Compensation & Benefits"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | HUMAN RESOURCES Main Module: Attendance Management | HUMAN RESOURCES Sub-Modules: Attendance records, shift schedules, work calendars, overtime, absence tracking, fingerprint device integration, attendance approval workflow. | Main Focus: Set up attendance, work schedules, overtime, absence control, and fingerprint device integration. | Main Deliverables: Attendance rules, shift schedules, work calendars, overtime workflow, absence tracking, fingerprint integration requirements. | Required Master Data: Shift codes, work calendars, attendance device locations, overtime rules, absence reasons. | Department / Key Users: HUMAN RESOURCES attendance team, operations supervisors, timekeeping administrators, IT integration support. | Expected Output: Attendance process design ready for configuration and device integration. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Attendance Owner> | Key User Placeholder: <Timekeeping Key User>",
    dueDate: new Date("2026-11-06T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Attendance Management",
    taskCode: "ERP-HR-SPR-04",
    title: "Sprint 4: HUMAN RESOURCES Attendance & Time Management"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | HUMAN RESOURCES Main Module: Leave Management | HUMAN RESOURCES Sub-Modules: Annual leave, sick leave, emergency leave, leave balance, leave requests, leave approvals, leave reports. | Main Focus: Manage leave requests, balances, approval workflows, and reporting. | Main Deliverables: Leave types, leave entitlement rules, leave balance calculation, leave request workflow, leave approval workflow, leave reports. | Required Master Data: Leave types, entitlement rules, accrual policies, holiday calendar, approver matrix. | Department / Key Users: HUMAN RESOURCES operations, leave administrator, department approvers. | Expected Output: Controlled leave administration with transparent balances and approvals. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Leave Owner> | Key User Placeholder: <Leave Admin Key User>",
    dueDate: new Date("2026-11-13T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Leave Management",
    taskCode: "ERP-HR-SPR-05",
    title: "Sprint 5: HUMAN RESOURCES Leave Management"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | HUMAN RESOURCES Main Module: Recruitment Management | HUMAN RESOURCES Sub-Modules: Recruitment requests, vacancy approval, candidate records, interview process, hiring approval, offer process, employee onboarding. | Main Focus: Manage recruitment requests, candidate lifecycle, hiring approvals, and onboarding. | Main Deliverables: Recruitment request workflow, candidate profile, interview evaluation, hiring approval workflow, onboarding checklist. | Required Master Data: Position requisitions, vacancy reasons, candidate stages, interview templates, onboarding tasks. | Department / Key Users: Recruitment lead, hiring managers, HUMAN RESOURCES onboarding coordinator. | Expected Output: Standard recruitment and onboarding process ready for operational use. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Recruitment Owner> | Key User Placeholder: <Onboarding Key User>",
    dueDate: new Date("2026-11-20T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Recruitment Management",
    taskCode: "ERP-HR-SPR-06",
    title: "Sprint 6: HUMAN RESOURCES Recruitment & Onboarding"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | HUMAN RESOURCES Main Module: Training Management | HUMAN RESOURCES Sub-Modules: Training needs, training plan, training courses, training providers, employee training records, training evaluation, training reports. | Main Focus: Build training planning, provider management, training history, and evaluation controls. | Main Deliverables: Training needs form, annual training plan, course catalog, provider list, employee training history, evaluation forms. | Required Master Data: Course catalog, provider list, competencies, training calendar, attendance records. | Department / Key Users: Training coordinator, learning and development lead, department training focal points. | Expected Output: Structured training governance and employee development tracking. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Training Owner> | Key User Placeholder: <L&D Key User>",
    dueDate: new Date("2026-11-27T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Training Management",
    taskCode: "ERP-HR-SPR-07",
    title: "Sprint 7: HUMAN RESOURCES Training & Development"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | HUMAN RESOURCES Main Module: Performance Management | HUMAN RESOURCES Sub-Modules: Objectives, KPIs, performance appraisal, manager evaluation, employee evaluation, performance approval workflow, performance reports. | Main Focus: Standardize employee objectives, KPI tracking, evaluations, and approvals. | Main Deliverables: Appraisal forms, KPI structure, evaluation workflow, manager review process, performance reports. | Required Master Data: KPI library, appraisal cycles, evaluator roles, scoring rules, approval matrix. | Department / Key Users: HUMAN RESOURCES performance lead, line managers, department heads. | Expected Output: Consistent performance management process with measurable evaluations. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Performance Owner> | Key User Placeholder: <Appraisal Key User>",
    dueDate: new Date("2026-12-04T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Performance Management",
    taskCode: "ERP-HR-SPR-08",
    title: "Sprint 8: HUMAN RESOURCES Performance Management"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | HUMAN RESOURCES Main Module: Employee Self-Service | HUMAN RESOURCES Sub-Modules: Employee profile view, leave requests, HUMAN RESOURCES requests, document requests, training requests, notifications, request tracking. | Main Focus: Let employees submit and track HUMAN RESOURCES-related requests through self-service. | Main Deliverables: Employee portal screens, HUMAN RESOURCES request forms, notification rules, request tracking workflow. | Required Master Data: Employee access profiles, request categories, notification templates, service catalog. | Department / Key Users: HUMAN RESOURCES service desk, employee communications team, selected pilot employees. | Expected Output: Employee-facing HUMAN RESOURCES portal scope approved for rollout. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <ESS Owner> | Key User Placeholder: <Employee Portal Key User>",
    dueDate: new Date("2026-12-11T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "Employee Self-Service",
    taskCode: "ERP-HR-SPR-09",
    title: "Sprint 9: HUMAN RESOURCES Employee Self-Service"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | HUMAN RESOURCES Main Module: HUMAN RESOURCES Document Management | HUMAN RESOURCES Sub-Modules: Personnel files, contracts, certificates, ID documents, medical documents, document expiry tracking, document approval. | Main Focus: Store and control HUMAN RESOURCES employee documents and expiry dates. | Main Deliverables: Employee document categories, upload process, expiry alerts, personnel file structure, document access rules. | Required Master Data: Document categories, retention rules, access roles, expiry thresholds, employee file checklist. | Department / Key Users: HUMAN RESOURCES records administrator, compliance representative, medical records focal point. | Expected Output: Controlled personnel file management with document expiry monitoring. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Document Control Owner> | Key User Placeholder: <Personnel File Key User>",
    dueDate: new Date("2026-12-18T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "HUMAN RESOURCES Document Management",
    taskCode: "ERP-HR-SPR-10",
    title: "Sprint 10: HUMAN RESOURCES Documents & Personnel Files"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | HUMAN RESOURCES Main Module: HUMAN RESOURCES Reporting | HUMAN RESOURCES Sub-Modules: Employee list, headcount report, manpower report, attendance report, leave balance report, training report, recruitment report, HUMAN RESOURCES dashboard. | Main Focus: Deliver HUMAN RESOURCES operational reporting and management dashboards. | Main Deliverables: Headcount report, manpower report, attendance report, leave report, training report, recruitment report, HUMAN RESOURCES dashboard. | Required Master Data: Reporting dimensions, KPI definitions, organizational rollups, access rules, reporting calendar. | Department / Key Users: HUMAN RESOURCES leadership, HUMAN RESOURCES analytics lead, department HUMAN RESOURCES focal points. | Expected Output: Management-ready HUMAN RESOURCES visibility across workforce operations and planning. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <HUMAN RESOURCES Reporting Owner> | Key User Placeholder: <HUMAN RESOURCES Analytics Key User>",
    dueDate: new Date("2026-12-25T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "HUMAN RESOURCES Reporting",
    taskCode: "ERP-HR-SPR-11",
    title: "Sprint 11: HUMAN RESOURCES Reports & Dashboards"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | HUMAN RESOURCES Main Module: HUMAN RESOURCES UAT and Go-Live | HUMAN RESOURCES Sub-Modules: UAT scenarios, test cases, issue log, data validation, key user sign-off, training, go-live checklist. | Main Focus: Complete testing, issue resolution, data validation, user acceptance, and go-live readiness. | Main Deliverables: HUMAN RESOURCES UAT scenarios, test results, issue log, HUMAN RESOURCES key user sign-off, validated employee master data, go-live checklist. | Required Master Data: Final employee master, cutover files, sign-off matrix, training attendance, issue tracking register. | Department / Key Users: HUMAN RESOURCES key users, PMO, ERP team, business process owners. | Expected Output: HUMAN RESOURCES go-live readiness approved with validated data and signed acceptance. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <HUMAN RESOURCES UAT Owner> | Key User Placeholder: <HUMAN RESOURCES Cutover Lead>",
    dueDate: new Date("2027-01-01T17:00:00.000Z"),
    mainModule: "HUMAN RESOURCES",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "HUMAN RESOURCES UAT and Go-Live",
    taskCode: "ERP-HR-SPR-12",
    title: "Sprint 12: HUMAN RESOURCES UAT & Go-Live Preparation"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P0 | SUPPLY CHAIN Main Module: SCM Foundation | SCM Sub-Modules: SCM workshops, current procurement procedures, current warehouse procedures, current logistics procedures, SCM forms collection, SCM reports collection, SCM key users, SCM approval workflows. | Main Focus: Collect existing SCM procedures, forms, reports, approval flows, key users, and current pain points after Finance, Payroll, and HUMAN RESOURCES priorities. | Main Deliverables: SCM requirement backlog, SCM key users list, collected forms, current procedures, initial SCM master data checklist. | Required Master Data: Current vendor records, item lists, warehouse/site lists, approval matrix, process KPIs baseline. | Department / Key Users: SCM manager, procurement lead, warehouse lead, logistics lead, finance liaison. | Expected Output: Approved SCM discovery pack and phased implementation backlog. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <SCM Product Owner> | Key User Placeholder: <SCM Super User>",
    dueDate: new Date("2027-01-08T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "SCM Foundation",
    taskCode: "ERP-SCM-SPR-00",
    title: "Sprint 0: SCM Discovery & Master Data Preparation"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | SUPPLY CHAIN Main Module: Vendor Management | SCM Sub-Modules: Vendor profile, supplier registration, vendor classification, vendor documents, vendor bank information, vendor tax information, vendor approval status, vendor performance tracking. | Main Focus: Build vendor master data and supplier records early for procurement execution. | Main Deliverables: Vendor master data structure, vendor registration form, vendor classification list, required vendor documents, vendor approval workflow. | Required Master Data: Supplier identities, tax registrations, banking details, categories, compliance documents, approval tiers. | Department / Key Users: Procurement lead, vendor management officer, finance AP liaison, compliance representative. | Expected Output: Controlled vendor onboarding and validated supplier base for sourcing. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Vendor Master Owner> | Key User Placeholder: <Vendor Key User>",
    dueDate: new Date("2027-01-15T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Vendor Management",
    taskCode: "ERP-SCM-SPR-01",
    title: "Sprint 1: Vendor & Supplier Master Data"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | SUPPLY CHAIN Main Module: Item Master Management | SCM Sub-Modules: Item master, material codes, item categories, unit of measure, spare parts, consumables, stock items, non-stock items, item specifications. | Main Focus: Build item and material master data early for purchasing, warehouse, and maintenance integration. | Main Deliverables: Item coding structure, item categories, unit of measure list, item specifications template, stock/non-stock classification. | Required Master Data: Material code rules, UOM catalog, item specs, commodity groups, stocking policy definitions. | Department / Key Users: Material master controller, maintenance planner, warehouse controller, procurement analyst. | Expected Output: Standardized item master foundation ready for transaction processing. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Item Master Owner> | Key User Placeholder: <Material Data Key User>",
    dueDate: new Date("2027-01-22T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Item Master Management",
    taskCode: "ERP-SCM-SPR-02",
    title: "Sprint 2: Item / Material Master Data"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | SUPPLY CHAIN Main Module: Procurement Management | SCM Sub-Modules: Purchase requisition, requester entry, department approval, budget check, technical review, PR workflow, PR status tracking. | Main Focus: Enable controlled purchase requisition creation and approvals before sourcing and receiving. | Main Deliverables: Purchase requisition form, approval workflow, budget check integration requirement, PR tracking screen, PR reports. | Required Master Data: Department requester matrix, approval limits, budget references, technical reviewer catalog. | Department / Key Users: Department requesters, procurement operations, finance budget controller, technical approvers. | Expected Output: Traceable PR lifecycle with governance controls. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <PR Process Owner> | Key User Placeholder: <PR Key User>",
    dueDate: new Date("2027-01-29T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Procurement Management - Purchase Requisition",
    taskCode: "ERP-SCM-SPR-03",
    title: "Sprint 3: Purchase Requisition"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | SUPPLY CHAIN Main Module: Procurement Management | SCM Sub-Modules: RFQ creation, supplier selection, quotation submission, quotation comparison, technical evaluation, commercial evaluation, award recommendation. | Main Focus: Execute RFQ and quotation evaluation after PR to support compliant supplier selection. | Main Deliverables: RFQ form, supplier invitation process, quotation comparison sheet, evaluation workflow, award recommendation process. | Required Master Data: Approved supplier list, evaluation criteria, technical/commercial scoring templates, sourcing committees. | Department / Key Users: Strategic sourcing, technical evaluators, commercial committee, procurement manager. | Expected Output: Structured and auditable quotation-to-award process. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <RFQ Owner> | Key User Placeholder: <Sourcing Key User>",
    dueDate: new Date("2027-02-05T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Procurement Management - RFQ",
    taskCode: "ERP-SCM-SPR-04",
    title: "Sprint 4: RFQ / Quotation Management"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P1 | SUPPLY CHAIN Main Module: Purchase Order Management | SCM Sub-Modules: Purchase order creation, PO approval workflow, PO terms and conditions, vendor acknowledgment, PO change order, PO status tracking, PO reports. | Main Focus: Implement PO creation, approvals, acknowledgment, and tracking before warehouse receiving. | Main Deliverables: PO form, PO approval workflow, PO print format, vendor acknowledgment process, PO status dashboard. | Required Master Data: PO numbering, commercial terms library, approver limits, vendor communication templates. | Department / Key Users: Procurement buyer team, PO approvers, vendor coordinators, finance AP liaison. | Expected Output: Controlled PO lifecycle linked to upstream PR/RFQ decisions. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <PO Owner> | Key User Placeholder: <Buyer Key User>",
    dueDate: new Date("2027-02-12T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "high",
    progress: 0,
    status: "open",
    subModule: "Purchase Order Management",
    taskCode: "ERP-SCM-SPR-05",
    title: "Sprint 5: Purchase Order"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | SUPPLY CHAIN Main Module: Contract Management | SCM Sub-Modules: Service contracts, framework agreements, contract approval, contract value tracking, contract expiry tracking, service order, contract documents. | Main Focus: Manage service contracts and agreements with value and expiry control. | Main Deliverables: Contract master record, contract approval workflow, service order process, contract expiry alerts, contract reports. | Required Master Data: Contract types, service categories, approval thresholds, validity rules, contract document checklist. | Department / Key Users: Contract administrator, procurement legal support, service owners, finance controller. | Expected Output: Governed contract and service order process with expiry visibility. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Contract Owner> | Key User Placeholder: <Contract Admin Key User>",
    dueDate: new Date("2027-02-19T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Contract Management",
    taskCode: "ERP-SCM-SPR-06",
    title: "Sprint 6: Contracts & Service Orders"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | SUPPLY CHAIN Main Module: Warehouse Management | SCM Sub-Modules: Goods receiving, GRN, inspection, delivery note, material certificate, receiving approval, stock update. | Main Focus: Receive purchased materials and update inventory in direct linkage with approved purchase orders. | Main Deliverables: GRN process, receiving form, inspection workflow, stock update rules, receiving reports. | Required Master Data: Warehouse receiving points, inspection criteria, certificate requirements, GRN numbering, PO linkage rules. | Department / Key Users: Warehouse receiving supervisors, QA inspectors, procurement expeditors, inventory controllers. | Expected Output: Controlled receiving process with PO-based inventory updates. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Receiving Owner> | Key User Placeholder: <GRN Key User>",
    dueDate: new Date("2027-02-26T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Warehouse Management - Receiving",
    taskCode: "ERP-SCM-SPR-07",
    title: "Sprint 7: Warehouse Receiving"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | SUPPLY CHAIN Main Module: Inventory Management | SCM Sub-Modules: Stock balance, warehouse locations, bin locations, minimum stock, maximum stock, reorder level, stock reservation, stock adjustment. | Main Focus: Control inventory balances, location hierarchy, and stocking thresholds linked to purchasing and receiving. | Main Deliverables: Warehouse location structure, bin location setup, stock control rules, stock adjustment workflow, stock balance report. | Required Master Data: Warehouse map, bin master, min/max levels, reorder policies, reservation priorities. | Department / Key Users: Inventory manager, warehouse supervisors, planning analyst, procurement planner. | Expected Output: Accurate inventory control model supporting operations and replenishment. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Inventory Owner> | Key User Placeholder: <Stock Control Key User>",
    dueDate: new Date("2027-03-05T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Inventory Management",
    taskCode: "ERP-SCM-SPR-08",
    title: "Sprint 8: Inventory & Stock Control"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | SUPPLY CHAIN Main Module: Warehouse Management | SCM Sub-Modules: Material issue request, issue approval, issue to department, issue to maintenance work order, material return, stock consumption, issue reports. | Main Focus: Control material issues, returns, and consumption with integration to maintenance work orders. | Main Deliverables: Material issue workflow, return process, stock consumption rules, issue reports, work order integration requirement. | Required Master Data: Issue reasons, maintenance work order references, return codes, consumption categories, authorization limits. | Department / Key Users: Warehouse issue team, maintenance planners, department storekeepers, inventory control. | Expected Output: Traceable issue/return process with maintenance integration capability. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Material Issue Owner> | Key User Placeholder: <Maintenance Integration Key User>",
    dueDate: new Date("2027-03-12T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Warehouse Management - Issue & Return",
    taskCode: "ERP-SCM-SPR-09",
    title: "Sprint 9: Material Issue & Return"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | SUPPLY CHAIN Main Module: Logistics Management | SCM Sub-Modules: Shipment request, shipment booking, shipping documents, customs documents, tracking status, delivery to warehouse/site, shipment cost tracking. | Main Focus: Manage shipment and delivery tracking with customs and shipping documentation controls. | Main Deliverables: Shipment tracking process, shipment document checklist, customs clearance workflow, delivery status tracking, shipment reports. | Required Master Data: Carriers, routes, incoterms, customs codes, shipment document templates, delivery points. | Department / Key Users: Logistics coordinator, customs specialist, warehouse inbound team, procurement expediting lead. | Expected Output: End-to-end logistics visibility from booking to site delivery. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Logistics Owner> | Key User Placeholder: <Shipment Tracking Key User>",
    dueDate: new Date("2027-03-19T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Logistics Management",
    taskCode: "ERP-SCM-SPR-10",
    title: "Sprint 10: Logistics & Shipment Tracking"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P2 | SUPPLY CHAIN Main Module: Procurement Finance Support | SCM Sub-Modules: LC request, LC approval, bank application, shipment documents, document discrepancy tracking, LC status, LC closure. | Main Focus: Support procurement and finance coordination for LC-based purchases. | Main Deliverables: LC request workflow, LC document checklist, LC status tracking, discrepancy tracking, LC closure process. | Required Master Data: LC banks, application templates, discrepancy codes, finance approval matrix, LC lifecycle statuses. | Department / Key Users: Trade finance officer, procurement finance liaison, logistics documentation specialist, treasury representative. | Expected Output: Controlled LC processing aligned with procurement and finance compliance. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <LC Process Owner> | Key User Placeholder: <Trade Finance Key User>",
    dueDate: new Date("2027-03-26T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "medium",
    progress: 0,
    status: "open",
    subModule: "Procurement Finance Support",
    taskCode: "ERP-SCM-SPR-11",
    title: "Sprint 11: Letter of Credit / LC Support"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | SUPPLY CHAIN Main Module: Vendor Collaboration | SCM Sub-Modules: Vendor login, vendor registration, RFQ access, quotation submission, PO acknowledgment, shipment document upload, invoice submission support, vendor communication. | Main Focus: Enable controlled and secure vendor collaboration where each vendor only accesses its own data. | Main Deliverables: Vendor portal requirements, vendor access rules, quotation upload, PO acknowledgment, shipment document upload, vendor communication workflow. | Required Master Data: Vendor access identities, portal roles, document permissions, communication templates, security controls. | Department / Key Users: Vendor collaboration lead, procurement operations, IT security, supplier relationship team. | Expected Output: Secure external supplier interaction model ready for controlled rollout. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <Vendor Portal Owner> | Key User Placeholder: <Supplier Collaboration Key User>",
    dueDate: new Date("2027-04-02T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "Vendor Collaboration",
    taskCode: "ERP-SCM-SPR-12",
    title: "Sprint 12: Vendor Portal / Vendor Collaboration"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | SUPPLY CHAIN Main Module: SCM Reporting | SCM Sub-Modules: PR report, RFQ report, PO report, vendor report, contract report, inventory report, stock movement report, shipment report, SCM dashboard. | Main Focus: Deliver SCM operational reporting and management dashboards. | Main Deliverables: PR report, PO report, vendor performance report, inventory balance report, stock movement report, shipment tracking report, SCM dashboard. | Required Master Data: Reporting dimensions, KPI definitions, process status taxonomy, organization rollups, role-based visibility rules. | Department / Key Users: SCM leadership, procurement analysts, warehouse analysts, logistics reporting users. | Expected Output: Management-ready SCM visibility and operational performance tracking. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <SCM Reporting Owner> | Key User Placeholder: <SCM Analytics Key User>",
    dueDate: new Date("2027-04-09T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "SCM Reporting",
    taskCode: "ERP-SCM-SPR-13",
    title: "Sprint 13: SCM Reports & Dashboards"
  }),
  sprintItemSeed({
    category: "software",
    description:
      "Priority: P3 | SUPPLY CHAIN Main Module: SCM UAT and Go-Live | SCM Sub-Modules: UAT scenarios, test cases, issue log, data validation, key user sign-off, user training, go-live checklist. | Main Focus: Complete testing, issue resolution, data validation, training, user acceptance, and go-live readiness. | Main Deliverables: SCM UAT scenarios, test results, issue log, SCM key user sign-off, validated vendor/item/warehouse data, go-live checklist. | Required Master Data: Final vendor master, item master, warehouse structure, cutover files, sign-off matrix, training records. | Department / Key Users: SCM key users, PMO, ERP team, procurement/warehouse/logistics process owners. | Expected Output: SCM go-live readiness approval with validated master data and signed acceptance. | Readiness %: 0% | Status Placeholder: Not Started | Owner Placeholder: <SCM UAT Owner> | Key User Placeholder: <SCM Cutover Lead>",
    dueDate: new Date("2027-04-16T17:00:00.000Z"),
    mainModule: "SUPPLY CHAIN",
    priority: "low",
    progress: 0,
    status: "open",
    subModule: "SCM UAT and Go-Live",
    taskCode: "ERP-SCM-SPR-14",
    title: "Sprint 14: SCM UAT & Go-Live Preparation"
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

  result.taskUpdatesDeleted = 0;
  result.tasksDeleted = 0;

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

    const existingTask = await TaskModel.findOne({ taskCode: itemSeed.taskCode });

    if (!existingTask) {
      await TaskModel.create({
        ...values,
        taskCode: itemSeed.taskCode
      });
      result.sprintItemsCreated += 1;
      continue;
    }

    existingTask.set(values);
    await existingTask.save();
    result.sprintItemsUpdated += 1;
  }

  return result;
}
