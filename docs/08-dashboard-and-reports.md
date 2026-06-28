# Dashboard And Reports

Dashboard and report values must be calculated by the backend from MongoDB.

## Metric Rules

- Reporting timezone: `Africa/Tripoli`.
- Week boundary: Monday 00:00 through next Monday 00:00 in the reporting timezone.
- Open requests: `draft`, `submitted`, `assigned`.
- Requests in progress: `in_progress`.
- Closed requests this week: `status=closed` and `closedAt` inside the current week.
- Active tasks: `open`, `in_progress`, `blocked`, `waiting_review`.
- Overdue tasks: active tasks with `dueDate` before now.
- Tasks completed this week: `status=completed` and `completedAt` inside the current week.

## Visibility Rules

- Super Admin sees all dashboard/report data.
- IT Manager sees all dashboard/report data in the current MVP because no team
  model exists in the approved scope.
- Supervisor sees data allowed by existing request/task row-level visibility.
- Employee sees own visible tasks, related requests, and own progress history.

## Implemented API

```text
GET /api/dashboard/summary
GET /api/dashboard/activity
GET /api/reports/requests
GET /api/reports/tasks
```

Security:

- Dashboard endpoints require `dashboard:view`.
- Report endpoints require `reports:view`.
- All endpoints apply the same row-level request/task visibility rules as the
  operational APIs.
- `users.byStatus` is included in dashboard summary only for Super Admin and IT
  Manager.

## Admin Dashboard KPIs

- Open requests
- Requests in progress
- Closed requests this week
- Active tasks
- Overdue tasks
- Blocked tasks
- Tasks waiting review
- Tasks completed this week
- Users by status

## Manager Dashboard

Show:

- Requests assigned to the manager or team
- Tasks by employee
- Overdue tasks
- Blocked tasks
- Waiting review tasks
- Recent task updates
- Recent request comments

## Employee Dashboard

Show:

- My active tasks
- My overdue tasks
- My blocked tasks
- My completed tasks this week
- My latest progress updates

## Request Report

Fields:

- Request code
- Title
- Type
- Priority
- Status
- Requested by
- Assigned to
- Required date
- Closed date
- Created date

Filters:

- Status
- Priority
- Type
- Requested by
- Assigned to
- Created date range
- Required date range
- Closed date range
- Search by request code, title, or requested department

Implemented request report query parameters:

```text
page
limit
sortBy
sortOrder
search
dateFrom
dateTo
status
priority
type
requestedBy
assignedTo
requiredDateFrom
requiredDateTo
closedDateFrom
closedDateTo
```

Allowed request report `sortBy` values:

```text
closedAt
createdAt
priority
requestCode
requiredDate
status
title
type
```

## Task Report

Fields:

- Task code
- Title
- Category
- Priority
- Status
- Progress
- Assigned to
- Created by
- Reviewed by
- Request code
- Start date
- Due date
- Completed date
- Last progress update

Filters:

- Status
- Priority
- Category
- Assigned user
- Created by
- Reviewed by
- Request
- Created date range
- Due date range
- Completed date range
- Overdue
- Search by task code, title, or category

Implemented task report query parameters:

```text
page
limit
sortBy
sortOrder
search
dateFrom
dateTo
status
priority
category
assignedTo
createdBy
reviewedBy
requestId
dueDateFrom
dueDateTo
completedDateFrom
completedDateTo
overdue
```

Allowed task report `sortBy` values:

```text
category
completedAt
createdAt
dueDate
lastProgressUpdateAt
priority
progress
startDate
status
taskCode
title
```

## User Workload Report

Fields:

- User
- Department
- Role
- Active tasks
- Overdue tasks
- Blocked tasks
- Completed tasks
- Average progress

Status: not implemented in Stage 11 initial API. This should be added before
the frontend workload screen if workload comparison is required in the first UI
release.

## Audit Log Report

Fields:

- Actor
- Action
- Entity type
- Entity ID
- Created date
- IP address
- User agent

Filters:

- Actor
- Action
- Entity type
- Date range

Status: covered by the existing protected audit log API:

```text
GET /api/audit-logs
GET /api/audit-logs/:id
```

## Cancelled Reports

Do not create purchase, product, asset, supplier, attachment, notification, or settings reports for the current system.
