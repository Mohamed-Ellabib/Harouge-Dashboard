# Scope And MVP

## MVP Scope

The MVP is limited to the current schema entities:

- Roles
- Permissions
- Users
- Requests
- Tasks
- Task updates
- Comments
- Audit logs

## Included Capabilities

- Admin can create and manage users.
- Admin can assign roles to users.
- Admin can manage permissions by role.
- Manager or supervisor can create and assign requests.
- Manager or supervisor can create and assign tasks.
- Employee can view assigned tasks.
- Employee can update task status and progress.
- Task updates preserve previous and new status/progress.
- Users can add comments to requests where permitted.
- Manager/admin can view audit logs.
- Dashboard shows request and task status.

## Cancelled For Now

These are outside the current system:

- Purchases / MR tracking
- Product catalog
- Asset management
- Supplier records
- Attachment upload metadata
- Notifications
- System settings module

## MVP Success Criteria

- Users can log in through the approved auth design.
- Role-based access control works.
- Requests can be created, assigned, updated, and closed.
- Tasks can be created, assigned, updated, reviewed, and closed.
- Task progress history is saved in `task_updates`.
- Comments are linked to requests only for MVP.
- Audit logs record important changes.
- Dashboard numbers are calculated by the backend from MongoDB.
