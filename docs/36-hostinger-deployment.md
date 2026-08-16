# Hostinger Deployment Guide

The production frontend is published at:

```text
https://violet-gerbil-872211.hostingersite.com
```

This repository contains two runtime parts:

- a React static frontend in `apps/web`
- a Node.js and Express API in `apps/api`

Hostinger's GitHub build-and-output deployment publishes static files only. It
does not run the Express API. A Hostinger VPS with a Node.js site is required to
host the API without using an external application host.

## Static Frontend Deployment

Use these settings in the Hostinger GitHub import screen:

```text
Framework preset: Other
Branch: main
Node version: 20.x
Root directory: ./
Build command: npm run web:build
Output directory: apps/web/dist
```

Add this build-time environment variable after the Hostinger VPS API has a
public HTTPS URL:

```text
VITE_API_BASE_URL=https://api.example.com
```

Replace `api.example.com` with the real Hostinger VPS API domain. Vite embeds
this public URL during the build, so redeploy the frontend after changing it.

The `apps/web/public/.htaccess` file provides the fallback required when a user
refreshes a React Router route such as `/dashboard`.

## Hostinger VPS API Deployment

Create a Node.js site in Hostinger CloudPanel, point an HTTPS domain such as
`api.example.com` to it, and select Node.js 20 or a compatible newer LTS
version.

Clone the GitHub repository on the VPS and run:

```bash
npm ci
npm run api:build
```

Create a root `.env` on the VPS with production values:

```dotenv
NODE_ENV=production
APP_NAME="ERP Sprint Progress System"
API_HOST=0.0.0.0
API_PORT=5000
API_BASE_URL=https://api.example.com
TRUST_PROXY_HOPS=1

MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER/itdcc?retryWrites=true&w=majority
MONGODB_DB_NAME=itdcc
MONGODB_AUTO_INDEX=false
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=0
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
MONGODB_CONNECT_TIMEOUT_MS=10000
MONGODB_SOCKET_TIMEOUT_MS=45000

AUTH_PROVIDER=local
SESSION_SECRET=GENERATE_A_RANDOM_SECRET_OF_AT_LEAST_48_CHARACTERS
COOKIE_NAME=itdcc_session
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
CSRF_COOKIE_NAME=itdcc_csrf
CSRF_HEADER_NAME=x-csrf-token
SESSION_TTL_HOURS=8
BCRYPT_SALT_ROUNDS=12
AUTH_MAX_FAILED_LOGIN_ATTEMPTS=5
AUTH_LOCK_MINUTES=15
AUTH_RATE_LIMIT_MAX_REQUESTS=20
FORCE_PASSWORD_CHANGE_ON_FIRST_LOGIN=true

RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=300
CORS_ORIGIN=https://violet-gerbil-872211.hostingersite.com
AUDIT_LOG_ENABLED=true
```

Start and persist the API with PM2:

```bash
npm install --global pm2
pm2 start npm --name erp-sprint-api -- run api:start
pm2 save
pm2 startup
```

Configure the CloudPanel reverse proxy to send the API domain to port `5000`.
Then verify:

```text
https://api.example.com/api/health
```

The response must report `success: true` and a connected database before the
frontend is deployed with `VITE_API_BASE_URL`.

## Single Hostinger VPS Alternative

For a same-origin deployment, point the final application domain directly to
the Hostinger VPS and run:

```bash
npm ci
npm run build
pm2 start npm --name erp-sprint-system -- start
```

Express serves both `/api/*` and the built frontend in this mode. Leave
`VITE_API_BASE_URL` unset, set `CORS_ORIGIN` and `API_BASE_URL` to the same final
HTTPS domain, and use `COOKIE_SAME_SITE=lax`.

## Security

- Never commit `.env`.
- Allow the Hostinger VPS outbound IP in MongoDB Atlas Network Access.
- Rotate any database or account password that has been shared outside the
  Hostinger secret configuration.
- Keep HTTPS enabled before using secure authentication cookies.