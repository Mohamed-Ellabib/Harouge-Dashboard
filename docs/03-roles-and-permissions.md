# Roles And Permissions

## Role Model

Roles and permissions are part of the current schema:

- `roles`
- `permissions`

Each user has one role through `users.role_id` in the SQL source, mapped to `users.roleId` in MongoDB planning.

Each permission belongs to one role through `permissions.role_id`, mapped to `permissions.roleId`.

## Approved Roles

- Super Admin
- IT Manager
- Supervisor
- Employee

## Role Responsibilities

### Super Admin

- Manage all users
- Manage all roles
- Manage all permissions
- View all requests and tasks
- View all audit logs

### IT Manager

- View all requests and tasks
- Assign requests
- Use internal request comments
- Create tasks
- Assign tasks
- Review completed tasks
- View operational dashboard
- View audit logs where permitted

### Supervisor

- View requests and tasks assigned to their area
- Create or assign tasks where permitted
- Review employee progress
- Add non-internal request comments

### Employee

- View assigned tasks
- Update own task status and progress
- Add non-internal request comments where permitted
- View related request details where permitted

## Permission Modules

Initial permission modules should match current system entities:

- `roles`
- `permissions`
- `users`
- `requests`
- `tasks`
- `task_updates`
- `comments`
- `audit_logs`
- `dashboard`
- `reports`

## Permission Actions

Draft actions:

- `view`
- `create`
- `update`
- `change_status`
- `assign`
- `review`
- `comment`
- `view_audit`

## Permission Matrix

| Capability | Super Admin | IT Manager | Supervisor | Employee |
| --- | --- | --- | --- | --- |
| Manage users | Yes | Limited | No | No |
| Manage roles | Yes | No | No | No |
| Manage permissions | Yes | No | No | No |
| Create requests | Yes | Yes | Yes | No |
| Assign requests | Yes | Yes | Limited | No |
| Create tasks | Yes | Yes | Yes | No |
| Assign tasks | Yes | Yes | Limited | No |
| Update own task progress | Yes | Yes | Yes | Yes |
| Review tasks | Yes | Yes | Limited | No |
| Add request comments | Yes | Yes | Non-internal | Non-internal |
| View internal comments | Yes | Yes | No | No |
| View audit logs | Yes | Limited | No | No |
| View dashboard | Yes | Yes | Limited | Own only |
