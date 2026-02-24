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
2. Route handler validates input (`src/server/validation/*`).
3. Route handler uses Prisma client (`src/server/db/client.ts`).
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

- `src/app/page.tsx`: MVP UI console.
- `src/app/api/health/route.ts`: DB health check.
- `src/app/api/students/route.ts`: create/update student.
- `src/app/api/subjects/route.ts`: create/list subjects.
- `src/server/validation/student.ts`: student payload schema.
- `src/server/validation/subject.ts`: subject payload/query schema.

## Working Session Commands

```bash
npm run dev
npx prisma dev
npm run lint
```

End-of-session commit helper:

```bash
npm run session:end -- -Message "feat: concise summary"
```

## Change Log Practice

For important structural changes, add a short note in `docs/` with:
- what changed
- why it changed
- migration impact
- any follow-up tasks

This keeps the architecture understandable over time.
