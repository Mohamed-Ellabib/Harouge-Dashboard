# AGENTS.md

## Project Context

This project is the IT Department Control Center.

Current scope is limited to the entities contained in `database/schema.sql`:

1. Roles
2. Permissions
3. Users
4. Requests
5. Tasks
6. Task updates
7. Comments
8. Audit logs

MongoDB Atlas is the active primary database, but implementation must map only these eight current entities unless the owner approves a scope change.

## Current Stage

Current stage: Stage 10 and MongoDB Atlas development provisioning are completed.

Atlas connectivity is verified, all eight collections and declared indexes are
provisioned, and four roles plus 81 permissions are seeded. The initial Super
Admin is seeded with first-login password change enforced. Stage 10.5
pre-dashboard hardening is implemented in code; `npm run api:test` and
`npm run api:db:setup` still need to be rerun when execution/network access is
available. A repeat-safe development dataset exists for three fictional role
accounts, requests, tasks, updates, comments, and audit logs; see
`docs/31-development-data-seed.md` and
`docs/32-stage-10-5-pre-dashboard-hardening.md`.

The planning gate has been approved by the owner. Future implementation must remain inside the approved current scope unless the owner approves a scope change.

## Planned Stack

- Frontend: React
- Backend: Node.js
- Database: MongoDB Atlas
- Data modeling: Mongoose with strict schemas, validation, and indexes
- Recommended: TypeScript for both frontend and backend
- Recommended backend framework: Express

## Active Engines

The system is organized around five current engines:

1. Access Control Engine
2. IT Request Engine
3. Task Control Engine
4. Comments And Task Updates Engine
5. Audit Log Engine

## Cancelled For Now

Do not build, document as active, or scaffold implementation for:

- Purchases / MR
- Products
- Assets
- Suppliers
- Attachments
- Notifications
- System settings

These were part of earlier planning but are not part of the current system.

## Non-Negotiable Rules

- Every important task status change must create history in `task_updates`.
- Task progress must be stored as updates, not only overwritten as a single number.
- Important actions must be audit logged.
- Dashboard totals must come from backend calculations.
- No public registration. Admin creates users.
- Use role-based permissions from the beginning.
- MongoDB collections must use strict Mongoose schemas; do not allow uncontrolled dynamic fields.
- Do not add collections that are not represented by the current scope without approval.

## Open Questions

- Confirm MongoDB Atlas approval for internal employee and operational data.
- Confirm production MongoDB Atlas details and backup policy.
- Confirm session length; current default is 8 hours.
- Confirm whether managers manage all users or only department/team users.
- Confirm report export requirements.

## Authentication Decision

- Use local email/password authentication.
- No Microsoft/company SSO for MVP.
- No public registration.
- Admin creates users.
- Store password data on the existing `users` collection only.
- Use bcrypt for password hashing.
- Use HTTP-only cookie sessions.
- Do not store JWT tokens in browser localStorage.
- `users.authUserId` is not used for MVP local auth and can remain empty.

## Approved MVP Values

- Roles: Super Admin, IT Manager, Supervisor, Employee.
- User statuses: `active`, `inactive`, `suspended`.
- Request statuses: `draft`, `submitted`, `assigned`, `in_progress`, `completed`, `rejected`, `cancelled`, `closed`.
- Task statuses: `open`, `in_progress`, `blocked`, `waiting_review`, `completed`, `cancelled`.
- Comments are assigned to requests only for MVP.
- Failed login lock policy: 5 failed attempts locks the user for 15 minutes.
- First login password change is required.
- Priorities: `low`, `medium`, `high`, `urgent`.
- Task categories: `support`, `network`, `server`, `software`, `hardware`, `access`, `maintenance`, `other`.
- Request types: `support`, `access`, `hardware`, `software`, `network`, `server`, `other`.
- No-update task rule is not part of MVP.
- Closed requests and tasks can be edited by Super Admin and IT Manager.

## Key Documents

Read these first:

- `docs/00-project-charter.md`
- `docs/01-system-understanding.md`
- `docs/04-workflows.md`
- `docs/05-data-model.md`
- `docs/09-business-rules.md`
- `docs/13-project-structure.md`
- `docs/14-open-questions.md`
- `docs/15-official-schema-review.md`
- `docs/16-mongodb-collection-model.md`
- `docs/17-implementation-roadmap.md`
- `docs/24-stage-7-requests-api.md`
- `docs/25-stage-7-enterprise-hardening.md`
- `docs/26-stage-8-tasks-api.md`
- `docs/27-stage-9-comments-api.md`
- `docs/28-stage-10-audit-logs-api.md`
- `docs/29-pre-dashboard-backend-review.md`
- `docs/30-mongodb-atlas-setup.md`
- `docs/decisions/0004-current-scope-from-sql-schema.md`
- `database/schema.sql`
