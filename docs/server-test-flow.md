# Server Test Flow

Use this checklist to validate the full app flow (auth + planner + estimator).

## 1) Environment

Set required env vars in PowerShell:

```powershell
$env:AUTH_SECRET="replace-with-a-long-random-secret"
```

If your schema changed, run migration + generate:

```powershell
npx prisma migrate dev --name auth_password
npx prisma generate
```

Start services:

```powershell
npx prisma dev
npm run dev
```

## 2) Auth

1. Open `http://localhost:3000/signup`.
2. Create a new account.
3. Confirm redirect to `/planner`.
4. Open `/login` while logged in and verify redirect back to `/planner`.
5. Click logout and verify protected planner routes redirect to `/login`.

Dev shortcut (local only, disabled in production):
- On `/login`, click `Instant demo access`.
- Requires local env setup:
  - `ENABLE_DEV_BOOTSTRAP=true`
  - `DEV_BOOTSTRAP_EMAIL=<local-test-email>`
  - `DEV_BOOTSTRAP_PASSWORD=<local-test-password>`

## 3) Planner Pages

From `/planner`, test each page:

1. `Profile`: update full name + weekly hours, save, reload page, verify values.
2. `Subjects`: create subjects and verify they appear in list.
3. `Exams`: create exam linked to one subject and verify list entry.
4. `Estimator`: run estimate and verify summary + confidence output.
5. `Focus`: run short session, verify XP/streak/session count changes.

## 4) API Access Rules

Open DevTools Network tab and verify protected API routes return `401` when logged out:

- `/api/students`
- `/api/subjects`
- `/api/exams`
- `/api/planning/estimate`

## 5) Regression Command Set

Before each push:

```powershell
npx prisma generate
npm run lint
npm run build
```
