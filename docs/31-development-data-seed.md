# Development Data Seed

Status: implemented and verified against the development Atlas database on
2026-06-25.

## Purpose

The development seed provides realistic, fictional IT operations data for API,
dashboard, authorization, and workflow testing. It remains inside the approved
eight-collection scope and must never be used as production business data.

## Command

```text
npm run api:seed:development
```

The command refuses to run when `NODE_ENV=production`.

## Development Accounts

| Role | Email | Password source |
| --- | --- | --- |
| IT Manager | `it.manager.demo@example.com` | `DEVELOPMENT_IT_MANAGER_PASSWORD` |
| Supervisor | `it.supervisor.demo@example.com` | `DEVELOPMENT_SUPERVISOR_PASSWORD` |
| Employee | `it.employee.demo@example.com` | `DEVELOPMENT_EMPLOYEE_PASSWORD` |

Passwords exist only in the local `.env`, are unique, and are not documented or
logged. Development accounts are seeded as active, ready-to-use demo accounts so
dashboard and API workflows can be tested without changing local seed passwords.
Additional fictional users are seeded for user-management list, filter, and
pagination testing. They reuse the role-specific development password sources.
The development seed also prepares the active Super Admin for local dashboard QA
by clearing local forced-change and lockout blockers without changing its
password. The production first-login password-change rule remains controlled by
the normal application configuration and initial-admin seed.

## Seeded Dataset

- 23 development users, plus the active Super Admin created by the admin seed
- 6 IT requests
- 9 tasks
- 12 immutable task updates
- 8 request comments
- 26 audit-log records

The request dataset covers assigned, in-progress, completed, closed, and rejected
states. The task dataset covers open, in-progress, blocked, waiting-review,
completed, and cancelled states.

Stable request codes use `REQ-DEMO-*`; stable task codes use `TASK-DEMO-*`.
Fictional names, reserved `.example`/`example.com` email addresses, and clearly
synthetic phone numbers prevent development records from being mistaken for real
personnel.

## Repeat Safety

The seed is repeat-safe:

- users are matched by email
- requests are matched by request code
- tasks are matched by task code
- task updates and comments are matched by stable content and parent record
- audit entries are matched by a private seed key
- existing development-account passwords are never overwritten on rerun
- the active Super Admin password is never overwritten on rerun

The second verification run created zero duplicate records.

## Production Rule

Do not copy these records or credentials to production. Production data must be
created through approved user and workflow operations. Remove development seed
passwords from deployment environments that do not use this dataset.
