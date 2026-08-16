# Hostinger Deployment Guide

The production frontend is published at:

```text
https://violet-gerbil-872211.hostingersite.com
```

Hostinger Business and Cloud plans support managed Node.js web apps deployed
directly from GitHub. This project runs as one Express application: Express
serves `/api/*` and the built React frontend from the same HTTPS origin.

## GitHub Deployment Settings

Choose **Deploy Web App**, import the GitHub repository, and use:

```text
Framework preset: Other
Branch: main
Node version: 20.x
Root directory: ./
Build command: npm run build
Output directory: apps/api/dist
Entry file: server.js
Start command (if shown): npm start
```

The entry file is relative to the selected output directory. If hPanel asks for
a project-root-relative entry instead, use `apps/api/dist/server.js`.

The root `build` script compiles the API and places the React build under
`apps/api/dist/web`. The root `start` script launches the compiled Express
server. Do not set `VITE_API_BASE_URL`; leaving it unset keeps all browser API
requests on the same Hostinger origin.

## Environment Variables

Use **Import .env** in Hostinger or add these values individually before the
first deployment:

```dotenv
NODE_ENV=production
APP_NAME="ERP Sprint Progress System"
API_HOST=0.0.0.0
API_PORT=3000
API_BASE_URL=https://violet-gerbil-872211.hostingersite.com
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
COOKIE_SAME_SITE=lax
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

Hostinger requires managed Node.js applications to listen on port `3000`.
`API_HOST=0.0.0.0` allows the platform proxy to reach Express, and
`TRUST_PROXY_HOPS=1` allows secure-cookie and client-address handling behind the
Hostinger proxy.

The MongoDB Atlas connection string and session secret are secrets. Do not add
`INITIAL_ADMIN_PASSWORD` or development seed passwords unless intentionally
running a one-time seed.

## Verify Deployment

After Hostinger reports the app as running, verify:

```text
https://violet-gerbil-872211.hostingersite.com/api/health
```

The response must report `success: true` and a connected database. Then open
`/login`, sign in, refresh a protected route, and confirm the session remains
active. Hostinger automatically redeploys when new commits reach `main`.

## Security

- Never commit `.env`.
- Use Hostinger's MongoDB Atlas connection wizard or allow the Hostinger app's
  outbound access in MongoDB Atlas Network Access.
- Rotate any database or account password that has been shared outside the
  Hostinger secret configuration.
- Keep HTTPS enabled before using secure authentication cookies.