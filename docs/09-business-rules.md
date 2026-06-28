# Business Rules

These rules protect the system from unreliable data.

## Request Rules

- Requests provide the business context for tasks.
- A request can have many tasks.
- A request should not close while required related tasks are still open.
- Rejected or cancelled requests must keep their history through audit logs.
- Closed requests can be edited by Super Admin and IT Manager.
- Request visibility is row-level for non-admin users.
- Employees can view only requests they created or requests assigned to them.
- Supervisors can also view requests in their department.
- Request status changes must follow the approved transition matrix in `docs/25-stage-7-enterprise-hardening.md`.

## Task Rules

- A task cannot be completed with progress below 100%.
- A task cannot move to waiting review with progress below 100%.
- A blocked task must have a blocking reason.
- An overdue task is any non-completed task where due date is in the past.
- Only the assigned employee can update their own task progress unless the user is manager/admin.
- Employees cannot reassign, cancel, or complete tasks.
- Completed and cancelled tasks can only be changed by Super Admin and IT Manager.
- Progress history must not be edited or deleted.
- Corrections should be added as new task updates, not by changing old history.
- Every status change must create a task update when progress/status changes.
- Closed tasks can be edited by Super Admin and IT Manager.

Task status transitions:

```text
open           -> in_progress, blocked, cancelled
in_progress    -> blocked, waiting_review, completed, cancelled
blocked        -> in_progress, waiting_review, cancelled
waiting_review -> in_progress, completed, blocked, cancelled
completed      -> in_progress, cancelled
cancelled      -> open, in_progress
```

## Comment Rules

- Comments are attached to requests for MVP.
- Task comments are not implemented for MVP.
- Old comments should not be physically deleted in normal workflows.
- Internal comments should only be visible to authorized users.
- Internal request comments are limited to Super Admin and IT Manager.
- Direct comment view requires access to the parent request.
- Direct comment edit is protected by `comments:update`.
- Comment updates must be audit logged.

## Audit Rules

- Every important action must create an audit log.
- Audit write failures block the action when audit logging is enabled.
- Users should not edit old progress history.
- Audit logs should not be editable from normal application flows.
- Audit log APIs are read-only.
- Audit log access is limited to Super Admin and IT Manager.
- The current schema does not include soft-delete/archive fields, so destructive delete endpoints should not be part of MVP.

## Dashboard Rules

- Dashboard numbers must come from backend calculations.
- Frontend should not guess totals or overdue status.
- No-update task alerts are not part of MVP.

## Cancelled Rules

Purchase, MR, product, asset, supplier, attachment, notification, and settings rules are cancelled for now.
