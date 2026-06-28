# Stage 11 Dashboard And Reports API

Status: initial API implemented and locally verified.

## Purpose

This stage gives the React frontend backend-calculated operational visibility.
The frontend must not calculate dashboard totals from raw lists because role
visibility, week boundaries, and overdue rules belong in the API.

## Implemented Endpoints

```text
GET /api/dashboard/summary
GET /api/dashboard/activity
GET /api/reports/requests
GET /api/reports/tasks
```

## Security

- Dashboard endpoints require `dashboard:view`.
- Report endpoints require `reports:view`.
- All dashboard and report queries use the existing request/task row-level
  visibility rules.
- Super Admin and IT Manager see all current MVP operational data.
- Supervisor and Employee dashboard data is limited to visible request/task
  records.
- Employee does not have `reports:view` in the default permissions.

## Dashboard Summary

`GET /api/dashboard/summary` returns:

- generated timestamp
- reporting timezone
- current week window
- request counts
- task counts
- request groupings by status, priority, and type
- task groupings by status, priority, and category
- average task progress
- users grouped by status for Super Admin and IT Manager

Metric rules:

- Timezone: `Africa/Tripoli`.
- Week: Monday 00:00 through next Monday 00:00.
- Open requests: `draft`, `submitted`, `assigned`.
- Active tasks: `open`, `in_progress`, `blocked`, `waiting_review`.
- Overdue tasks: active tasks with `dueDate` before now.

## Dashboard Activity

`GET /api/dashboard/activity` returns recent task updates and request comments.

Query parameters:

```text
limit
```

Rules:

- `limit` defaults to `10`.
- `limit` must be between `1` and `50`.
- Non-admin users only see activity for visible tasks and visible requests.
- Internal comments are excluded for non-admin users.

## Reports

Request and task report rows include display references for related users and
linked requests so the frontend does not need immediate extra lookups for names
or request codes.

Request report:

```text
GET /api/reports/requests
```

Task report:

```text
GET /api/reports/tasks
```

Exact filter and sort parameters are documented in `docs/08-dashboard-and-reports.md`.

## Not Yet Implemented

- User workload report endpoint.
- Export formats such as CSV or Excel.
- Saved report presets.

These are not required before the first dashboard UI can start, but the workload
report should be added before building the frontend workload comparison screen.

## Verification

Completed:

```text
npm run api:typecheck
npm run api:test:typecheck
npm run api:test
npm run api:build
```

The integration suite includes dashboard summary, dashboard activity, request
report, and task report coverage.
