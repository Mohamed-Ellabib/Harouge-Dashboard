# Stage 10.5 Pre-Dashboard Hardening

Status: implemented and locally verified; live Atlas index/seed reconciliation
still needs to be rerun from an Atlas-allowlisted machine.

## Purpose

This stage closes enterprise-readiness issues found before dashboard and report
API work. The API foundation was functional, but dashboard work would have built
on unsafe logging, weak first-login enforcement, missing workflow invariants, and
non-atomic write behavior.

## Implemented Fixes

- HTTP request logging now serializes only safe request fields and does not log
  cookies, CSRF headers, authorization headers, or set-cookie values.
- Users with `mustChangePassword=true` are restricted to auth/me, CSRF, logout,
  login, and change-password endpoints until they change the password.
- Sensitive mutations now run inside MongoDB transactions.
- Business records use optimistic concurrency through Mongoose versioning.
- Request closure is blocked when linked tasks are still open, in progress,
  blocked, or waiting review.
- Supervisor permissions now include `requests:change_status`, matching the
  documented request workflow.
- Dashboard/report indexes were added for closed requests, completed tasks,
  recent task updates, recent comments, and recent audit records.
- Health checks now ping MongoDB and return `503` when degraded.
- Production configuration now rejects unsafe cookie, audit, CORS, and weak
  session-secret settings.
- A login-specific rate limit was added in addition to account lockout.
- Integration-test scaffolding was added with an isolated replica set for auth,
  CSRF, workflow, transaction rollback, concurrency, and permission tests.

## Verification

Completed:

```text
npm run api:typecheck
npm run api:build
npm run api:test:typecheck
npm run api:test
```

The integration suite passed with coverage for:

- database-backed health checks
- first-login password-change enforcement
- CSRF enforcement
- request closure blocked by active linked tasks
- transaction rollback when an audit write fails
- optimistic concurrency conflicts
- supervisor `requests:change_status` permission

## Required Follow-Up

Run after Atlas network access is available from the current machine:

```text
npm run api:db:setup
```

This will reconcile the new indexes and supervisor permission in Atlas.
The latest attempt from the Codex runner failed because Atlas rejected the
connection from a non-allowlisted IP address.

## Dashboard Metric Definitions

The dashboard API must use these definitions unless the owner changes them:

- Reporting timezone: `Africa/Tripoli`.
- Week boundary: Monday 00:00 through next Monday 00:00 in the reporting timezone.
- Open requests: `draft`, `submitted`, `assigned`.
- Requests in progress: `in_progress`.
- Closed requests this week: `status=closed` and `closedAt` inside the current week.
- Active tasks: `open`, `in_progress`, `blocked`, `waiting_review`.
- Overdue tasks: active tasks with `dueDate` before now.
- Blocked tasks: `status=blocked`.
- Tasks waiting review: `status=waiting_review`.
- Tasks completed this week: `status=completed` and `completedAt` inside the current week.
- Users by status: count users grouped by `active`, `inactive`, and `suspended`.

## Dashboard Visibility

- Super Admin: all dashboard and report data.
- IT Manager: all dashboard and report data in the current MVP because no team
  or department-ownership model exists in the approved eight-collection scope.
- Supervisor: visible requests/tasks according to existing row-level visibility.
- Employee: own visible tasks, related requests, and own progress history.

## Production Notes

The current development Atlas network rule is temporary. Production still needs
stable restricted network access, backups, restore testing, monitoring, audit-log
retention, and deployment automation.
