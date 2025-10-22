# Sentry Setup Guide (quick start)

This document shows a short, safe 3-step process to create and wire a Sentry project for the frontend (Browser / Vue) and how to configure alerts and CI sourcemap uploads.

If you already created a Sentry account, use the steps below to create a project and connect it to the repository.

## 1) Create a Sentry project (3 steps)

- Go to <https://sentry.io> and sign in.
- From the top-left organization selector choose your organization (or create one).
- Click "Projects" → "Create Project" and follow the wizard:
  1. Choose platform: Browser (select "Vue" if shown) — this will provide the recommended SDK snippet.
  2. Name your project (e.g., "chunk-flow-frontend") and choose a team.
  3. Finish the wizard; copy the DSN shown (you'll paste it into `.env.local`).

Notes:

- We recommend creating a separate Sentry project for the frontend (Browser/Vue) and one for any backend (API) service. This makes it easy to quickly see where errors originate.

## 2) Configure the frontend repo

Files already added to this repo:

- `.env.example` — example values, add `VITE_SENTRY_DSN` here locally.
- `src/sentry.ts` — Sentry init helper (dynamic import; safe no-op if DSN empty).
- `index.tsx` — calls the Sentry init helper lazily so Sentry does not block startup.
- `.github/workflows/sentry-sourcemaps.yml` — workflow skeleton that builds and uploads sourcemaps when you push to main/master. You must add the required secrets below.

Local steps:

1. Copy `.env.example` to `.env.local` (or set locally via your environment) and set only the public DSN:

```bash
cp .env.example .env.local
# then edit .env.local and set VITE_SENTRY_DSN to the DSN from Sentry
```

2. Start dev server and confirm Sentry doesn't crash if DSN missing:

```bash
npm run dev
```

3. In dev mode you can trigger a test error from the console (the app exposes `window.triggerTestError` in non-production builds):

```js
window.triggerTestError()
```

Once you set `VITE_SENTRY_DSN`, Sentry events from the browser will be sent to the project.

## 3) CI & source-map uploads (quick)

Add the following repository secrets in GitHub (Repository Settings → Secrets & variables → Actions):

- `SENTRY_AUTH_TOKEN` — a token with `project:write` and `auth:org` permissions. Create a token in Sentry: Settings → Developer Settings → Auth Tokens.
- `SENTRY_ORG` — your organization slug (lowercase string seen in the Sentry URL).
- `SENTRY_PROJECT` — your project slug (lowercase string seen in the project settings).
- (optional) `VITE_SENTRY_DSN` — if you prefer not to store DSN in `.env` files.

The included workflow `.github/workflows/sentry-sourcemaps.yml` will:

1. Build the project.
2. Create a release in Sentry using the git short SHA.
3. Upload `dist` sourcemaps using `sentry-cli`.
4. Finalize the release.

Important: Do NOT store `SENTRY_AUTH_TOKEN` in any file; it must be a secret in CI.

---

Alerting recommendation (example):

- Alert me on high priority issues when there are more than 10 occurrences of a unique error in 1 minute. Example configuration:
  - In Sentry: Project → Alerts → New Alert → Issue Alert
  - Trigger: When events > 10 in 1 minute
  - Actions: Email team members, and add Slack/Webhook integration as needed.

To connect Slack or other messaging providers, go to Organization Settings → Integrations and add the provider, then enable it on the project alert rule.

---

If you'd like, I can:

- A) Create a Sentry project via the Sentry API for you (I will need `SENTRY_AUTH_TOKEN` and the org slug), or
- B) Walk through creating the alert rule and Slack integration step-by-step remotely, or
- C) Finish wiring the CI workflow to tag releases with your GitHub repo releases and upload sourcemaps (I will add a small action to set the `release` name to the tag/sha).

Tell me which option you prefer and I will proceed.
