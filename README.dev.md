# StudyApp Developer README

This file is the implementation-oriented companion to `README.md`.

Use it to understand code organization, conventions, and how to extend features safely.

## Core Principles

- Keep API contracts explicit and stable.
- Validate all external input with `zod`.
- Keep route handlers thin; move reusable logic to shared server modules.
- Prefer small, focused changes with clear commit messages.

## Current Backend Design

### Request flow

1. UI calls route handlers under `src/app/api/*`.
2. Route handler checks auth session for protected endpoints (`src/server/auth/*`).
3. Route handler validates input (`src/server/validation/*`).
4. Route handler uses Prisma client (`src/server/db/client.ts`).
4. Response is returned through helpers (`src/server/http/response.ts`).

### Why this structure

- Validation, error shape, and DB access stay consistent across endpoints.
- New endpoints can follow a known pattern with less duplication.

## Data Model Source of Truth

- File: `prisma/schema.prisma`
- After model changes:
  1. `npx prisma migrate dev --name <change_name>`
  2. `npx prisma generate`

Never edit generated files under `src/generated/prisma/*`.

## API Response Convention

- Success: `{ data: ... }`
- Error: `{ error: string, details?: unknown, issues?: unknown }`

Helpers:
- `apiSuccess(...)`
- `apiError(...)`
- `getErrorDetails(...)`

## Key Files

- `src/app/page.tsx`: public homepage.
- `src/app/login/page.tsx`: login UI.
- `src/app/signup/page.tsx`: signup UI.
- `src/app/planner/layout.tsx`: protected planner shell + nav.
- `src/app/planner/page.tsx`: planner overview page.
- `src/app/planner/*/page.tsx`: split planner feature pages.
- `src/app/api/health/route.ts`: DB health check.
- `src/app/api/auth/*`: register/login/logout/current session.
- `src/app/api/students/route.ts`: create/update authenticated student profile.
- `src/app/api/subjects/route.ts`: create/list authenticated subjects.
- `src/app/api/exams/route.ts`: create/list authenticated exams.
- `src/app/api/planning/estimate/route.ts`: stochastic and personalized estimate API.
- `src/server/auth/session.ts`: signed cookie token create/verify.
- `src/server/auth/require-session.ts`: auth guard helper for APIs.
- `src/server/validation/student.ts`: student payload schema.
- `src/server/validation/subject.ts`: subject payload schema.
- `src/server/validation/exam.ts`: exam payload schema.
- `src/server/validation/planning.ts`: estimate payload schema.
- `src/server/services/planning-estimator.ts`: Monte Carlo + Bayesian calibration logic.
- `docs/interaction-os-skeleton.md`: project operating skeleton for human-AI collaboration.

## Working Session Commands

```bash
npm run dev
npx prisma dev
npx prisma generate
npm run lint
npm run build
npm run test:smoke
```

`npm run test:smoke` expects the app already running on `http://localhost:3000` and validates:
- health
- dev bootstrap auth
- session profile
- student upsert
- subject create/list
- exam create
- planning estimate

## Local Demo Login

For fast local testing, use the dev-only bootstrap endpoint:
- `POST /api/auth/dev-bootstrap`
- Disabled unless explicitly enabled with:
  - `ENABLE_DEV_BOOTSTRAP=true`
  - `DEV_BOOTSTRAP_EMAIL=<local-test-email>`
  - `DEV_BOOTSTRAP_PASSWORD=<local-test-password>`
- Disabled automatically when `NODE_ENV=production`

End-of-session commit helper:

```bash
npm run session:end -- -Message "feat: concise summary"
```

Default behavior is core-only staging (safe publish):
- Includes app/server code and core config.
- Excludes `.env*`, local DB artifacts, and unrelated local files.
- Add docs when needed:

```bash
npm run session:end -- -Message "docs: update architecture notes" -IncludeDocs
```

- Add public assets when needed:

```bash
npm run session:end -- -Message "feat: update landing visuals" -IncludePublicAssets
```

## Change Log Practice

For important structural changes, add a short note in `docs/` with:
- what changed
- why it changed
- migration impact
- any follow-up tasks

This keeps the architecture understandable over time.
