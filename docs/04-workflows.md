# Workflows

## Main Request-To-Task Workflow

```text
request created
  -> request assigned
  -> task created
  -> task assigned
  -> task progress updated
  -> task waiting review
  -> task completed
  -> request closed
```

## Request Status

The SQL file stores request status as text. Approved values:

- `draft`
- `submitted`
- `assigned`
- `in_progress`
- `completed`
- `rejected`
- `cancelled`
- `closed`

## Task Status

The SQL file stores task status as text. Approved values:

- `open`
- `in_progress`
- `blocked`
- `waiting_review`
- `completed`
- `cancelled`

## Task Progress Workflow

Every task progress update should:

- Read the current task status and progress
- Store previous status and progress in `task_updates`
- Store new status and progress in `task_updates`
- Update the current task status and progress on `tasks`
- Update `tasks.last_progress_update_at`
- Create an audit log for important changes

## Comment Workflow

Comments belong to requests for MVP.

The supplied schema includes both `request_id` and `task_id`, but `task_id` is not used in MVP. Task comments should not be implemented unless approved later.

## Audit Workflow

Important actions should write an audit log:

- User created
- User status changed
- Role changed
- Permission changed
- Request created or status changed
- Task created, reassigned, reviewed, or status changed
- Task progress changed
- Comment added if required by policy

## Cancelled Workflows

Purchase/MR, product catalog, asset, supplier, attachment, and notification workflows are cancelled for now.
