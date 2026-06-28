# UI Page Map

## Main Navigation

- Dashboard
- Requests
- Tasks
- Users
- Roles
- Permissions
- Reports
- Audit Logs

Cancelled pages for now:

- Purchases / MR
- Products
- Assets
- Suppliers
- Attachments
- Notifications
- Settings

## Login Page

Purpose:

- Authenticate the user with local email/password.

Main fields:

- Email
- Password

## Dashboard Page

Admin/manager dashboard should show:

- Open requests
- Requests by status
- Active tasks
- Overdue tasks
- Blocked tasks
- Tasks waiting review
- Employee workload
- Recent task updates
- Recent audit activity

Employee dashboard should show:

- My active tasks
- My overdue tasks
- My blocked tasks
- My tasks waiting review

## Requests List Page

Main columns:

- Request code
- Title
- Type
- Priority
- Status
- Requested by
- Assigned to
- Required date
- Created date

Filters:

- Status
- Priority
- Type
- Requested by
- Assigned to
- Required date

Actions:

- Create request
- View request
- Change status if permitted
- Assign request if permitted

## Request Details Page

Sections:

- Request information
- Assigned user
- Related tasks
- Comments
- Audit summary where permitted

Actions:

- Edit request
- Change status
- Assign request
- Add comment
- Close request

## Tasks List Page

Main columns:

- Task code
- Title
- Category
- Priority
- Status
- Progress
- Assigned to
- Due date
- Last progress update

Filters:

- Status
- Priority
- Category
- Assigned to
- Request
- Due date

Actions:

- Create task
- View task
- Reassign task
- Update status
- Update progress

## Task Details Page

Sections:

- Task information
- Related request
- Assignment details
- Progress history
- Review information
- Audit summary where permitted

Actions:

- Edit task
- Reassign task
- Update progress
- Change status
- Mark blocked
- Submit for review
- Complete task if permitted

## Users Page

Main columns:

- Full name
- Email
- Role
- Job title
- Department
- Phone
- Status
- Last login

Actions:

- Create user
- Edit user
- Change role
- Activate/deactivate user

## Roles Page

Main columns:

- Name
- Display name
- System role
- Description
- Created date

Actions:

- Create role
- Edit role
- View permissions

## Permissions Page

Main columns:

- Role
- Module
- Name
- Display name
- Description

Actions:

- Create permission
- Edit permission
- Filter by role
- Filter by module

## Reports Page

Current reports:

- Request report
- Task report
- User workload report
- Audit log report

## Audit Logs Page

Main columns:

- Actor
- Action
- Entity type
- Entity ID
- Created date
- IP address

Actions:

- View details
- Filter by actor
- Filter by action
- Filter by entity type
- Filter by date
