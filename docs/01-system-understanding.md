# System Understanding

## What The System Is

The system is an internal control center for IT department work.

For the current version, it manages:

- User accounts and roles
- Permissions by role
- IT requests
- Tasks linked to requests
- Task progress updates
- Comments on requests and tasks
- Audit logs for important actions

## What The System Is Not For Now

The current schema does not contain purchase, product, asset, supplier, attachment, notification, or settings tables. Those modules are cancelled for now and must not be treated as active requirements.

## Main Flow

```text
User/requester creates or submits an IT request
  -> manager/supervisor reviews and assigns responsibility
  -> task is created and assigned to an employee
  -> employee updates status and progress
  -> comments are added when needed
  -> task update history is preserved
  -> request/task is closed when work is complete
  -> audit log records important actions
```

## Core Value

The manager can see:

- Which requests exist
- Which tasks are active
- Which tasks are overdue
- Which employees own which tasks
- Whether task progress is being updated
- What changed and who changed it

## Current Data Source

The current scope is defined by `database/schema.sql`. MongoDB is the planned implementation database, but the MongoDB collections should map to the current schema entities.
