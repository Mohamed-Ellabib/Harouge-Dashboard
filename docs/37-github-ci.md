# Pull request CI and the Hostinger deployment gate

The workflow in `.github/workflows/ci.yml` runs on every pull request targeting
`main`, including updates to an open pull request. It uses Node.js 20 and
explicitly selects npm 10, installs the root lockfile with `npm ci`, runs API,
API-test and frontend TypeScript checks, runs API tests, and runs the existing
root production build for both backend and frontend.

The single required check is named **CI verification**. There are no path
filters or optional checks: a failed command fails the job and prevents success.

## Test database isolation

No repository or environment secrets are passed to the job. The API integration
tests create a local `MongoMemoryReplSet` and set `MONGODB_URI` to its URI before
importing the API. The runner may download a MongoDB binary; no Atlas database
or MongoDB service credentials are needed. Do not add production database
secrets, seed commands, database setup commands, or an API server start to CI.

## Required repository configuration

After the pull request has run CI, an administrator should configure protection
for `main` in GitHub Settings > Branches (or an equivalent active ruleset):

1. Require a pull request before merging.
2. Require status checks to pass before merging; select **CI verification**
   from GitHub Actions after it appears in the check list.
3. Require branches to be up to date before merging. This ensures changes are
   checked against the latest `main`.
4. Enable **Do not allow bypassing the above settings**, including administrators,
   and leave any pull-request bypass list empty. With rulesets, use an active
   enforcement rule and no bypass actors.
5. Keep force pushes and branch deletion disabled.

Require approvals only if that fits the team's review process; the CI gate does
not depend on a particular review count. Availability of protection for a private
repository depends on the GitHub plan.

Confirm a failing pull request cannot merge and a direct push to `main` is
rejected for the accounts and integrations used by the team. Do not intentionally
push a failing commit to production to test this.

## Deployment remains unchanged

The existing Hostinger settings and `docs/36-hostinger-deployment.md` are
unchanged. Hostinger still redeploys when commits reach `main`; it does not wait
for this workflow. CI runs before merge on the pull request's test merge commit.
The required-check and pull-request rules are what keep unverified changes out
of `main`. CI alone cannot block a direct push or an administrator bypass.

This workflow intentionally does not deploy, access Hostinger, or run on pushes
to `main`. A post-push check would be too late to gate automatic redeployment.
If merge queue is enabled later, also add a `merge_group` trigger and adjust the
concurrency group for that event before making this check required for the queue.
