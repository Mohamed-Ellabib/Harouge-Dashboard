# Open Questions

These questions should be answered before full implementation starts.

## Data And Hosting

1. Is MongoDB Atlas approved for internal company data?
2. Which MongoDB Atlas region, project, and cluster tier should be used?
3. What should the production database name be?
4. What backup policy is required?
5. Are employee names, task details, and request details considered sensitive under company policy?

## Authentication

1. What temporary password process should admins use when creating users?
2. How long should a login session last? Current default: 8 hours.

Approved:

- Local email/password authentication.
- 5 failed attempts locks login for 15 minutes.
- First login password change is required.

## Users And Permissions

1. What exact permission modules and actions should be used?
2. Can managers manage all users, or only users in their department/team?
3. Should supervisors manage teams, sections, or both?

Approved launch roles:

- Super Admin
- IT Manager
- Supervisor
- Employee

## Workflow

1. Should task comments be enabled later, or stay request-only?
2. Should soft-delete/archive fields be added later, or should MVP avoid destructive deletes?

Approved:

- User statuses: `active`, `inactive`, `suspended`.
- Request statuses: `draft`, `submitted`, `assigned`, `in_progress`, `completed`, `rejected`, `cancelled`, `closed`.
- Task statuses: `open`, `in_progress`, `blocked`, `waiting_review`, `completed`, `cancelled`.
- Priorities: `low`, `medium`, `high`, `urgent`.
- Task categories: `support`, `network`, `server`, `software`, `hardware`, `access`, `maintenance`, `other`.
- Request types: `support`, `access`, `hardware`, `software`, `network`, `server`, `other`.
- Comments are assigned to requests only for MVP.
- No-update task alerts are not part of MVP.
- Closed requests and tasks can be edited by Super Admin and IT Manager.

## Reports

1. Which monthly report format does management expect?
2. Is Excel export mandatory in MVP?
3. Is PDF export mandatory in MVP?
4. Should reports include employee performance scores? Recommendation: not in MVP.

## Cancelled Scope

1. Should purchases/MR, products, assets, suppliers, attachments, notifications, or settings stay cancelled until after MVP?
2. If any cancelled module returns later, which approved schema or collection model should define it?
