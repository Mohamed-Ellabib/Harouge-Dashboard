CREATE TABLE `roles` (
  `id` uuid PRIMARY KEY,
  `name` text UNIQUE NOT NULL,
  `display_name` text NOT NULL,
  `description` text,
  `is_system` boolean,
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `permissions` (
  `id` uuid PRIMARY KEY,
  `role_id` uuid NOT NULL,
  `name` text NOT NULL,
  `display_name` text NOT NULL,
  `module` text NOT NULL,
  `description` text,
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `users` (
  `id` uuid PRIMARY KEY,
  `auth_user_id` uuid UNIQUE,
  `full_name` text NOT NULL,
  `email` text UNIQUE NOT NULL,
  `role_id` uuid,
  `job_title` text,
  `department` text,
  `phone` text,
  `status` text,
  `last_login_at` timestamp,
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `requests` (
  `id` uuid PRIMARY KEY,
  `request_code` text UNIQUE NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `type` text,
  `priority` text,
  `status` text,
  `requested_by` uuid,
  `requested_for_department` text,
  `assigned_to` uuid,
  `required_date` date,
  `closed_at` timestamp,
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `tasks` (
  `id` uuid PRIMARY KEY,
  `task_code` text UNIQUE NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `category` text,
  `priority` text,
  `status` text,
  `progress` numeric,
  `assigned_to` uuid,
  `created_by` uuid,
  `reviewed_by` uuid,
  `request_id` uuid,
  `start_date` date,
  `due_date` date,
  `completed_at` timestamp,
  `blocked_reason` text,
  `last_progress_update_at` timestamp,
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `task_updates` (
  `id` uuid PRIMARY KEY,
  `task_id` uuid NOT NULL,
  `updated_by` uuid,
  `previous_status` text,
  `new_status` text,
  `previous_progress` numeric,
  `new_progress` numeric,
  `note` text,
  `created_at` timestamp
);

CREATE TABLE `comments` (
  `id` uuid PRIMARY KEY,
  `request_id` uuid,
  `task_id` uuid,
  `body` text NOT NULL,
  `is_internal` boolean,
  `created_by` uuid,
  `created_at` timestamp
);

CREATE TABLE `audit_logs` (
  `id` uuid PRIMARY KEY,
  `actor_id` uuid,
  `action` text NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` uuid,
  `old_value` jsonb,
  `new_value` jsonb,
  `ip_address` text,
  `user_agent` text,
  `created_at` timestamp
);

CREATE UNIQUE INDEX `permissions_index_0` ON `permissions` (`role_id`, `name`);

ALTER TABLE `users` ADD FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

ALTER TABLE `permissions` ADD FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

ALTER TABLE `requests` ADD FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`);

ALTER TABLE `requests` ADD FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`);

ALTER TABLE `tasks` ADD FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`);

ALTER TABLE `tasks` ADD FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`);

ALTER TABLE `tasks` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

ALTER TABLE `tasks` ADD FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`);

ALTER TABLE `task_updates` ADD FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`);

ALTER TABLE `task_updates` ADD FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

ALTER TABLE `audit_logs` ADD FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`);
