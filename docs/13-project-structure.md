# Project Structure

This structure defines the environment and module boundaries for the current implementation.

## Root

```text
IT-Department-Control-Center/
  AGENTS.md
  README.md
  .env.example
  .gitignore
  package.json
  apps/
  database/
  docs/
```

## Applications

```text
apps/
  api/
    README.md
    package.json
    src/
      config/
      middleware/
      modules/
      shared/
        database/
      utils/
      validators/
  web/
    README.md
    package.json
    src/
      app/
      api/
      components/
      context/
      features/
      hooks/
      routes/
      styles/
      utils/
```

## Database

```text
database/
  README.md
  schema.sql
  mongodb/
    README.md
```

MongoDB Atlas is the active planned database technology. The SQL file defines the current system scope and field mapping.

## Backend Module Boundaries

```text
apps/api/src/modules/
  auth/             Login, logout, current user
  roles/            Role records
  permissions/      Permission records attached to roles
  users/            Accounts, employee profiles, status
  it-requests/      Internal IT requests
  tasks/            Task records and assignment
  task-updates/     Progress and status history
  comments/         Request comments
  dashboard/        Backend KPI calculations
  reports/          Reports from current-scope data
  audit-logs/       Protected action history
```

## Frontend Feature Boundaries

```text
apps/web/src/features/
  auth/             Login and session state
  dashboard/        Admin, manager, employee dashboards
  requests/         IT request list and details
  tasks/            Task list, details, progress
  users/            User management
  roles/            Role management
  permissions/      Permission management
  reports/          Current-scope reports
  audit-logs/       Audit log viewer
```

## Cancelled Folders

Do not add active folders for:

- purchases
- products
- assets
- suppliers
- attachments
- notifications
- settings

## Naming Direction

Use the short internal package name `itdcc` where a concise technical identifier is needed.

Examples:

- Root package: `it-department-control-center`
- API package: `@itdcc/api`
- Web package: `@itdcc/web`
