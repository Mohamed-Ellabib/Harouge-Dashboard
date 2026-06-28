# Decision 0006: Approved MVP Values

## Status

Accepted on 2026-06-24.

## Decision

The following values are approved for MVP implementation.

## Roles

- Super Admin
- IT Manager
- Supervisor
- Employee

## User Statuses

- `active`
- `inactive`
- `suspended`

## Request Statuses

- `draft`
- `submitted`
- `assigned`
- `in_progress`
- `completed`
- `rejected`
- `cancelled`
- `closed`

## Task Statuses

- `open`
- `in_progress`
- `blocked`
- `waiting_review`
- `completed`
- `cancelled`

## Comments

Comments are assigned to requests only for MVP.

The SQL source includes `comments.task_id`, but task comments should not be implemented unless approved later.

## Authentication Policy

- Failed login lock: 5 failed attempts.
- Lock duration: 15 minutes.
- Force password change on first login: yes.

## Priorities

- `low`
- `medium`
- `high`
- `urgent`

## Task Categories

- `support`
- `network`
- `server`
- `software`
- `hardware`
- `access`
- `maintenance`
- `other`

## Request Types

- `support`
- `access`
- `hardware`
- `software`
- `network`
- `server`
- `other`

## Closed Record Editing

Closed requests and tasks can be edited by Super Admin and IT Manager.

## No-Update Rule

No-update task alerts are not part of MVP.

## Still Open

- MongoDB Atlas connection details
- Session length; current default is 8 hours
- Report export requirements
