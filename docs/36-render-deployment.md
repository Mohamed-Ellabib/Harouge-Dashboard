# Render Deployment Guide

Status date: 2026-06-28

This project is prepared for Render as one Node web service. The API serves
`/api/*`, and in production it also serves the built React frontend from
`apps/web/dist`.

## What Was Added

- `render.yaml` at the project root.
- Root `package.json` Node engine hint for Render.
- API production static serving for the React build.
- API port fallback from Render's `PORT` environment variable.

## Render Service Shape

Render service:

```text
erp-sprint-progress-system
```

Runtime:

```text
node
```

Build command:

```text
npm ci && npm run api:build && npm run web:build
```

Start command:

```text
npm run api:start
```

Health check:

```text
/api/health
```

Region:

```text
frankfurt
```

Frankfurt was selected because the current MongoDB Atlas cluster has been using
the Frankfurt region.

## Required Before Deploying

Render Blueprint deployments require the repository to be pushed to GitHub,
GitLab, or Bitbucket.

This local folder currently has no Git repository detected. Create one before
opening the Render Blueprint:

```text
cd C:\Users\MSI\Desktop\SysControl\IT-Department-Control-Center
git init
git add .
git commit -m "Prepare Render deployment"
git branch -M main
git remote add origin <YOUR_GITHUB_OR_GITLAB_REPO_URL>
git push -u origin main
```

Do not commit `.env`; it is already ignored.

## Render Dashboard Steps

1. Push the repo with `render.yaml`.
2. Open Render Dashboard.
3. Create a new Blueprint from the Git repository.
4. Review the service named `erp-sprint-progress-system`.
5. Fill the secret `MONGODB_URI` value.
6. Apply the Blueprint.
7. After Render creates the service, verify the service URL.

The expected service URL is:

```text
https://erp-sprint-progress-system.onrender.com
```

If Render gives a different URL, update these environment variables in Render:

```text
API_BASE_URL=<actual Render service URL>
CORS_ORIGIN=<actual Render service URL>
```

Then redeploy.

## Required Render Environment Values

The Blueprint sets safe production defaults and asks Render to generate
`SESSION_SECRET`.

You must fill:

```text
MONGODB_URI
```

Use the same Atlas connection string format currently used locally.

Do not expose:

- Atlas password
- `SESSION_SECRET`
- initial admin password
- temporary user passwords

## MongoDB Atlas Network Access

Render services connect outbound through region-specific IP ranges. After the
Render service exists, open the Render service page, use the Connect menu, and
copy the Outbound IP ranges.

In MongoDB Atlas:

1. Open Network Access.
2. Add the Render outbound CIDR ranges.
3. Wait for the entries to become active.
4. Redeploy or restart the Render service if the first deploy failed before
   Atlas access was added.

Temporary option for first testing only:

```text
0.0.0.0/0
```

Remove that broad access after confirming the Render outbound ranges.

## Database Setup

If Render uses the existing Atlas database, the roles, permissions, admin user,
ERP team users, sprints, and sprint items should already exist.

If you point Render to a new empty database, run setup once with the production
MongoDB URI:

```text
npm run api:db:setup
```

Only seed demo or ERP data intentionally. Do not run development seed against
production.

## Verification

After deploy:

```text
https://erp-sprint-progress-system.onrender.com/api/health
```

Expected result:

```text
success: true
```

Then open:

```text
https://erp-sprint-progress-system.onrender.com/login
```

Sign in with the real admin account.

## Important Notes

- Free Render services can sleep when inactive. Use a paid instance for a system
  that project management expects to be instantly available.
- Keep MongoDB Atlas backups enabled before sharing the system broadly.
- Keep all production secrets only in Render environment variables.
