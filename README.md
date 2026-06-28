# Task & Requests Control System

This project is the planning and architecture base for an internal IT department control system.

Current stage: MongoDB Atlas development provisioning is complete. Connectivity,
eight collections, indexes, four roles, 81 permissions, and the initial Super
Admin are verified. A repeat-safe fictional operations dataset is seeded for
development and dashboard testing. Stage 10.5 pre-dashboard hardening is
verified. Stage 11 initial dashboard/report API work is implemented and tested.
Stage 12 sign-in page foundation is implemented.

## Current Scope

The current system scope is limited to the entities in the supplied SQL file:

1. Roles
2. Permissions
3. Users
4. Requests
5. Tasks
6. Task updates
7. Comments
8. Audit logs

MongoDB Atlas remains the planned database technology, but the active MongoDB collections must map to those eight entities for now.

## Cancelled For Now

The following modules are not part of the current system:

- Purchases / MR
- Products
- Assets
- Suppliers
- Attachments
- Notifications
- System settings

Do not build or scaffold those modules unless the project owner approves a new scope change.

## Purpose

The system controls IT department requests, employee task assignment, task progress, comments, and audit history.

The admin or IT manager should be able to open the dashboard and understand the current department situation within 30 seconds:

- What requests are open
- What tasks are active
- What tasks are late
- Who is responsible
- Which employee has too much work
- Which item needs manager action today
- What was completed this week

## Planned Stack

- Frontend: React
- Backend: Node.js
- Database: MongoDB Atlas
- Database modeling: Mongoose with strict schemas and approved indexes
- Recommended language: TypeScript
- Recommended API style: REST

## Main Engines

1. Access Control Engine
2. IT Request Engine
3. Task Control Engine
4. Comments And Task Updates Engine
5. Audit Log Engine

## Project Layout

```text
IT-Department-Control-Center/
  apps/
    api/                 Backend API application
    web/                 Frontend application placeholder
  docs/                  System knowledge base and architecture
  database/              Current SQL scope reference and MongoDB planning
  .env.example           Environment variable template
  .gitignore
  package.json           Workspace placeholder
```

Start by reading:

1. `docs/00-project-charter.md`
2. `docs/01-system-understanding.md`
3. `docs/04-workflows.md`
4. `docs/05-data-model.md`
5. `docs/16-mongodb-collection-model.md`
6. `docs/09-business-rules.md`
7. `docs/15-official-schema-review.md`
8. `docs/decisions/0004-current-scope-from-sql-schema.md`
9. `docs/17-implementation-roadmap.md`
10. `docs/decisions/0005-local-authentication.md`
11. `docs/decisions/0006-approved-mvp-values.md`
12. `docs/18-stage-1-api-foundation.md`
13. `docs/19-stage-2-shared-infrastructure.md`
14. `docs/20-stage-3-mongoose-models.md`
15. `docs/21-stage-4-seed-data.md`
16. `docs/22-stage-5-authentication.md`
17. `docs/23-stage-6-access-management-api.md`
18. `docs/24-stage-7-requests-api.md`
19. `docs/25-stage-7-enterprise-hardening.md`
20. `docs/26-stage-8-tasks-api.md`
21. `docs/27-stage-9-comments-api.md`
22. `docs/28-stage-10-audit-logs-api.md`
23. `docs/29-pre-dashboard-backend-review.md`
24. `docs/30-mongodb-atlas-setup.md`
25. `docs/31-development-data-seed.md`
26. `docs/32-stage-10-5-pre-dashboard-hardening.md`
27. `docs/33-stage-11-dashboard-reports-api.md`
28. `docs/34-stage-12-sign-in-page.md`

## Implementation Rule

Every new stage must keep the current scope locked to the eight approved entities and must update the knowledge base when API behavior, permissions, workflows, security rules, or data fields change.
