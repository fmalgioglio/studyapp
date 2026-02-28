# StudyApp

StudyApp is a planning platform for students in high school and beyond.

The objective is simple: convert study material (books, notes, topics) into a realistic weekly plan that helps users reach exam dates with stronger preparation and lower stress.

## Why This Project

- Students often know what to study but not how to pace it.
- This app translates workload into concrete weekly effort.
- The roadmap includes AI support for study guidance and content understanding.

## Current MVP Scope

- Health endpoint to verify server and DB connectivity.
- Cookie-based authentication (register, login, logout, current session).
- Protected planner area with split feature pages (overview, focus, profile, subjects, exams, estimate).
- Student profile update with weekly study capacity.
- Subject creation and listing for authenticated user.
- Exam creation and listing for authenticated user.
- Stochastic planning estimate with personalized calibration hooks.
- Focus lock timer with XP/streak reward loop.
- Responsive UI flow with dedicated pages instead of a single long console.

## Tech Stack

- `Next.js` (App Router)
- `TypeScript` (strict mode)
- `Prisma` ORM
- `PostgreSQL` (via Prisma local dev server)
- `Zod` for API input validation

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Start local database service

```bash
npx prisma dev
```

3. Apply migrations and generate client

```bash
npx prisma migrate dev --name init_core
npx prisma generate
```

4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

5. Set auth secret for session cookies (required)

```bash
# PowerShell
$env:AUTH_SECRET="replace-with-a-long-random-secret"
```

## API Endpoints (MVP)

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/students`
- `GET /api/subjects`
- `POST /api/subjects`
- `GET /api/exams`
- `POST /api/exams`
- `POST /api/planning/estimate`

## Project Structure

- `src/app/*`: UI pages and route handlers.
- `src/server/db/*`: database client and server-side data access.
- `src/server/http/*`: reusable API response helpers.
- `src/server/validation/*`: request validation schemas.
- `prisma/schema.prisma`: data model source of truth.
- `docs/*`: implementation and workflow documentation.
- `docs/ml-maturity-plan.md`: model roadmap from baseline to advanced ML.
- `docs/server-test-flow.md`: end-to-end auth/planner test checklist.

## Roadmap

1. Open-source web foundation (privacy-first, reproducible local setup, stable planner workflow).
2. Store-ready mobile app layer (shared logic, platform UI shell, offline-safe focus tracking).
3. Agentic coach layer (adaptive planning agent, proactive nudges, learning loop).

## Privacy And Open-Source Guardrails

- Never commit `.env*` files or machine-local credentials.
- Keep auth/testing shortcuts behind explicit dev-only environment flags.
- Keep public docs free of sensitive account details or personal access data.
- Keep mascot and visual assets under open-source compatible licensing.

## Contribution

Ideas and feedback are welcome.

If you want to collaborate, open an issue with:
- problem statement
- proposed direction
- expected user impact
